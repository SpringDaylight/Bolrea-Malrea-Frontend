import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { recommendMovies, explainRecommendation, calculateSatisfaction, type Movie } from '../api/llmRecommend';
import MainLayout from '../components/layout/MainLayout';
import '../styles/LLMRecommendPage.css';
import {
  getStorageItem,
  removeStorageItem,
  setJsonToStorage,
  safeParseJson,
} from '../utils/storage';

// localStorage 키
const STORAGE_KEY = 'llm_recommend_state';

// 저장할 상태 타입
interface SavedState {
  input: string;
  recommendations: Movie[];
  explanation: string;
  useOrchestrator: boolean;
  keywordCandidates: Movie[];
  vectorCandidates: Movie[];
  keywordWeight: number;
  emotionWeight: number;
  timestamp: number;
}

export default function LLMRecommendPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lastAutoQueryRef = useRef<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const useOrchestrator = true;  // 항상 오케스트레이션 모드 사용
  const [keywordCandidates, setKeywordCandidates] = useState<Movie[]>([]);
  const [vectorCandidates, setVectorCandidates] = useState<Movie[]>([]);
  const [keywordWeight, setKeywordWeight] = useState<number>(0);
  const [emotionWeight, setEmotionWeight] = useState<number>(0);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<number, boolean>>({});
  const [satisfactionScores, setSatisfactionScores] = useState<Record<number, number>>({});
  const [loadingSatisfaction, setLoadingSatisfaction] = useState<Record<number, boolean>>({});

  // 컴포넌트 마운트 시 localStorage에서 복원
  useEffect(() => {
    try {
      const saved = getStorageItem(STORAGE_KEY);
      if (saved) {
        const state = safeParseJson<SavedState | null>(saved, null);
        if (!state) {
          removeStorageItem(STORAGE_KEY);
          return;
        }
        
        // 24시간 이내 데이터만 복원 (선택사항)
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (Date.now() - state.timestamp < ONE_DAY) {
          setInput(state.input);
          setRecommendations(state.recommendations);
          setExplanation(state.explanation);
          // useOrchestrator는 항상 true이므로 복원하지 않음
          setKeywordCandidates(state.keywordCandidates || []);
          setVectorCandidates(state.vectorCandidates || []);
          setKeywordWeight(state.keywordWeight || 0);
          setEmotionWeight(state.emotionWeight || 0);
        } else {
          // 오래된 데이터는 삭제
          removeStorageItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to restore state:', err);
      removeStorageItem(STORAGE_KEY);
    }
  }, []);

  // 상태 변경 시 localStorage에 저장
  useEffect(() => {
    // 추천 결과가 있을 때만 저장
    if (recommendations.length > 0) {
      try {
        const state: SavedState = {
          input,
          recommendations,
          explanation,
          useOrchestrator,
          keywordCandidates,
          vectorCandidates,
          keywordWeight,
          emotionWeight,
          timestamp: Date.now()
        };
        setJsonToStorage(STORAGE_KEY, state);
      } catch (err) {
        console.error('Failed to save state:', err);
      }
    }
  }, [input, recommendations, explanation, useOrchestrator, keywordCandidates, vectorCandidates, keywordWeight, emotionWeight]);

  const handleRecommend = async (value?: string) => {
    const query = (value ?? input).trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setError('');
    setRecommendations([]);
    setExplanation('');
    setKeywordCandidates([]);
    setVectorCandidates([]);
    setInput(query);

    try {
      const response = await recommendMovies({
        user_input: query,
        top_k: 5,
        use_orchestrator: useOrchestrator
      });

      setRecommendations(response.recommendations);
      setExplanation(response.explanation);
      setKeywordCandidates(response.keyword_candidates || []);
      setVectorCandidates(response.vector_candidates || []);
      setKeywordWeight(response.keyword_weight || 0);
      setEmotionWeight(response.emotion_weight || 0);
    } catch (err) {
      console.error('Recommendation error:', err);
      setError(err instanceof Error ? err.message : '추천에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setRecommendations([]);
    setExplanation('');
    setError('');
    setKeywordCandidates([]);
    setVectorCandidates([]);
    removeStorageItem(STORAGE_KEY);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRecommend();
    }
  };

  const handleRecommendClick: React.MouseEventHandler<HTMLButtonElement> = () => {
    handleRecommend();
  };

  const handleMovieClick = (movie: Movie) => {
    navigate(movie.detail_url);
  };

  const handleExplainClick = async (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation(); // 영화 카드 클릭 이벤트 방지
    
    // 이미 로딩 중이면 무시
    if (loadingExplanations[movie.movie_id]) return;
    
    // 이미 설명이 있으면 토글
    if (expandedExplanations[movie.movie_id]) {
      setExpandedExplanations(prev => {
        const next = { ...prev };
        delete next[movie.movie_id];
        return next;
      });
      return;
    }
    
    // LLM 설명 요청
    setLoadingExplanations(prev => ({ ...prev, [movie.movie_id]: true }));
    
    try {
      const response = await explainRecommendation({
        user_input: input,
        movie_title: movie.title,
        movie_synopsis: movie.synopsis,
        genres: movie.genres,
        keyword_score: movie.keyword_score,
        emotion_score: movie.emotion_score,
        final_score: movie.final_score
      });
      
      setExpandedExplanations(prev => ({
        ...prev,
        [movie.movie_id]: response.explanation
      }));
    } catch (err) {
      console.error('Explanation error:', err);
      setExpandedExplanations(prev => ({
        ...prev,
        [movie.movie_id]: '설명을 생성하는 중 오류가 발생했습니다.'
      }));
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [movie.movie_id]: false }));
    }
  };

  const handleSatisfactionClick = async (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation(); // 영화 카드 클릭 이벤트 방지
    
    // 이미 로딩 중이면 무시
    if (loadingSatisfaction[movie.movie_id]) return;
    
    // 이미 점수가 있으면 토글
    if (satisfactionScores[movie.movie_id] !== undefined) {
      setSatisfactionScores(prev => {
        const next = { ...prev };
        delete next[movie.movie_id];
        return next;
      });
      return;
    }
    
    // 로그인 확인 (JWT 토큰만 확인)
    const accessToken = getStorageItem("mw_access_token");
    
    // 디버깅 로그
    console.log('🔍 [LLMRecommend] 만족도 계산 시도:', {
      movie_id: movie.movie_id,
      hasAccessToken: !!accessToken
    });
    
    if (!accessToken) {
      console.error('❌ [LLMRecommend] 로그인 정보 없음');
      alert('로그인이 필요한 기능입니다.');
      return;
    }
    
    // 만족도 계산 요청
    setLoadingSatisfaction(prev => ({ ...prev, [movie.movie_id]: true }));
    
    try {
      console.log('📤 [LLMRecommend] calculateSatisfaction 호출 (JWT 인증)');
      
      // JWT 인증을 사용하므로 user_id 전달 불필요
      const response = await calculateSatisfaction({
        movie_id: movie.movie_id
      });
      
      console.log('✅ [LLMRecommend] 만족도 계산 성공:', response);
      
      setSatisfactionScores(prev => ({
        ...prev,
        [movie.movie_id]: response.satisfaction_probability
      }));
    } catch (err: any) {
      console.error('❌ [LLMRecommend] 만족도 계산 실패:', err);
      if (err.message?.includes('로그인') || err.message?.includes('401')) {
        alert('로그인이 필요한 기능입니다.');
      } else if (err.message?.includes('404')) {
        alert('사용자 선호도 정보를 찾을 수 없습니다. 영화를 평가하거나 리뷰를 작성해주세요.');
      } else {
        alert('만족도를 계산하는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoadingSatisfaction(prev => ({ ...prev, [movie.movie_id]: false }));
    }
  };

  const renderCandidateCard = (movie: Movie, index: number) => (
    <div 
      key={`${movie.movie_id}-${index}`}
      className={`candidate-card ${movie.is_selected ? 'selected' : 'not-selected'}`}
      onClick={() => handleMovieClick(movie)}
    >
      {movie.poster_url ? (
        <img 
          src={movie.poster_url} 
          alt={movie.title}
          className="candidate-poster"
        />
      ) : (
        <div className="candidate-poster-placeholder">
          🎬
        </div>
      )}
      <div className="candidate-info">
        <h4>{movie.title}</h4>
        <p className="candidate-genres">{movie.genres.join(', ')}</p>
        <div className="candidate-score">
          <span className="score-badge">
            {(movie.final_score! * 100).toFixed(0)}%
          </span>
          {movie.is_selected ? (
            <span className="selected-badge">✅ 선택됨</span>
          ) : (
            <span className="not-selected-badge">❌ 제외됨</span>
          )}
        </div>
        {movie.not_selected_reason && (
          <p className="not-selected-reason">💭 {movie.not_selected_reason}</p>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    const query = searchParams.get('q');
    if (!query) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    if (lastAutoQueryRef.current === trimmed) return;
    lastAutoQueryRef.current = trimmed;
    handleRecommend(trimmed);
  }, [searchParams]);

  return (
    <MainLayout>
      <div className="llm-recommend-page">
        <div className="recommend-container">
        <div className="recommend-header">
          <h1>🎬 AI 영화 추천</h1>
          <p>자연어로 원하는 영화를 설명하면 AI가 추천해드립니다</p>
        </div>

        <div className="search-section">
          <div className="search-box">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="어떤 영화를 찾으시나요? (예: 우울한 기분을 달래줄 영화)"
              rows={3}
              disabled={isLoading}
            />
            
            <button 
              onClick={handleRecommendClick} 
              disabled={!input.trim() || isLoading}
              className="recommend-btn"
            >
              {isLoading ? '추천 중...' : '🎯 추천받기'}
            </button>
            
            {(recommendations.length > 0 || explanation) && (
              <button 
                onClick={handleClear}
                disabled={isLoading}
                className="clear-btn"
                title="결과 지우기"
              >
                🗑️
              </button>
            )}
          </div>

          <div className="example-queries">
            <p>예시:</p>
            <button onClick={() => setInput('우울한 기분을 달래줄 영화')}>
              우울한 기분을 달래줄 영화
            </button>
            <button onClick={() => setInput('설레는 로맨스 영화')}>
              설레는 로맨스 영화
            </button>
            <button onClick={() => setInput('반전이 있는 스릴러')}>
              반전이 있는 스릴러
            </button>
            <button onClick={() => setInput('가족과 함께 볼 따뜻한 영화')}>
              가족과 함께 볼 따뜻한 영화
            </button>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <p>❌ {error}</p>
          </div>
        )}

        {isLoading && (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>AI가 영화를 추천하고 있습니다...</p>
          </div>
        )}

        {explanation && !isLoading && (
          <div className="explanation-section">
            <h2>💡 추천 이유</h2>
            <div className="explanation-content">
              {explanation}
            </div>
          </div>
        )}

        {recommendations.length > 0 && !isLoading && (
          <div className="results-section">
            <h2>🎬 추천 영화 ({recommendations.length}개)</h2>
            <div className="movie-grid">
              {recommendations.map((movie) => (
                <div key={movie.movie_id} className="movie-container">
                  {/* 영화 카드 (클릭 시 상세 페이지) */}
                  <div 
                    className="movie-card"
                    onClick={() => handleMovieClick(movie)}
                  >
                    {movie.poster_url ? (
                      <img 
                        src={movie.poster_url} 
                        alt={movie.title}
                        className="movie-poster"
                      />
                    ) : (
                      <div className="movie-poster-placeholder">
                        🎬
                      </div>
                    )}
                    <div className="movie-info">
                      <h3>{movie.title}</h3>
                      <p className="movie-genres">{movie.genres.join(', ')}</p>
                      <p className="movie-year">📅 {movie.release_year}</p>
                      {movie.rating && (
                        <p className="movie-rating">⭐ {movie.rating.toFixed(1)}</p>
                      )}
                      {movie.reason && (
                        <p className="movie-reason">💡 {movie.reason}</p>
                      )}
                      <div className="movie-similarity">
                        <div className="similarity-bar">
                          <div 
                            className="similarity-fill"
                            style={{ width: `${movie.similarity_score * 100}%` }}
                          ></div>
                        </div>
                        <span className="similarity-label">
                          {(movie.similarity_score * 100).toFixed(0)}% 일치
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 카드 */}
                  <div className="action-card" onClick={(e) => e.stopPropagation()}>
                    {/* 만족도 확률 버튼 */}
                    <button 
                      className="satisfaction-btn"
                      onClick={(e) => handleSatisfactionClick(movie, e)}
                      disabled={loadingSatisfaction[movie.movie_id]}
                    >
                      {loadingSatisfaction[movie.movie_id] ? (
                        <>⏳ 계산 중...</>
                      ) : satisfactionScores[movie.movie_id] !== undefined ? (
                        <>📊 만족도: {(satisfactionScores[movie.movie_id] * 100).toFixed(1)}%</>
                      ) : (
                        <>💝 내 취향 만족도</>
                      )}
                    </button>
                    
                    {/* LLM 설명 버튼 */}
                    <button 
                      className="explain-btn"
                      onClick={(e) => handleExplainClick(movie, e)}
                      disabled={loadingExplanations[movie.movie_id]}
                    >
                      {loadingExplanations[movie.movie_id] ? (
                        <>⏳ 생성 중...</>
                      ) : expandedExplanations[movie.movie_id] ? (
                        <>📖 설명 닫기</>
                      ) : (
                        <>🤖 AI 상세 설명</>
                      )}
                    </button>
                    
                    {/* LLM 설명 내용 */}
                    {expandedExplanations[movie.movie_id] && (
                      <div className="llm-explanation">
                        <p>{expandedExplanations[movie.movie_id]}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 후보군 섹션 (오케스트레이터 모드) */}
        {useOrchestrator && !isLoading && (keywordCandidates.length > 0 || vectorCandidates.length > 0) && (
          <div className="candidates-section">
            <h2>🔍 추천 과정</h2>
            
            {keywordWeight > 0 && emotionWeight > 0 && (
              <div className="weight-info">
                <p>
                  <strong>가중치 설정:</strong> 키워드 {(keywordWeight * 100).toFixed(0)}% / 감성 {(emotionWeight * 100).toFixed(0)}%
                </p>
              </div>
            )}

            {keywordCandidates.length > 0 && (
              <div className="candidate-group">
                <h3>🔍 키워드 검색 후보 (상위 {keywordCandidates.length}개)</h3>
                <p className="candidate-description">
                  제목과 시놉시스에서 키워드를 찾아 매칭한 결과입니다.
                </p>
                <div className="candidate-grid">
                  {keywordCandidates.map((movie, index) => renderCandidateCard(movie, index))}
                </div>
              </div>
            )}

            {vectorCandidates.length > 0 && (
              <div className="candidate-group">
                <h3>🎭 감성 검색 후보 (상위 {vectorCandidates.length}개)</h3>
                <p className="candidate-description">
                  영화의 감성 프로필과 요청의 유사도를 계산한 결과입니다.
                </p>
                <div className="candidate-grid">
                  {vectorCandidates.map((movie, index) => renderCandidateCard(movie, index))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && recommendations.length === 0 && !explanation && (
          <div className="empty-state">
            <div className="empty-icon">🎭</div>
            <h3>영화를 추천받아보세요</h3>
            <p>위의 입력창에 원하는 영화의 분위기나 장르를 입력하세요</p>
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
