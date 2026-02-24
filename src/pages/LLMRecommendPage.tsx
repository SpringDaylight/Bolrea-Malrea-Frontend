import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { recommendMovies, explainRecommendation, type Movie } from '../api/llmRecommend';
import MainLayout from '../components/layout/MainLayout';
import '../styles/LLMRecommendPage.css';

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
  const [visibleExplanations, setVisibleExplanations] = useState<Record<number, boolean>>({});

  // 컴포넌트 마운트 시 localStorage에서 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: SavedState = JSON.parse(saved);
        
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
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to restore state:', err);
      localStorage.removeItem(STORAGE_KEY);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    setExpandedExplanations({});  // AI 상세 설명 캐시 초기화
    setVisibleExplanations({});  // AI 상세 설명 표시 상태 초기화
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
    localStorage.removeItem(STORAGE_KEY);
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

  // 추가 추천 영화 선택 (메인 추천과 겹치지 않게, 가중치 비율로 5개)
  const getAdditionalRecommendations = (): Movie[] => {
    if (!keywordCandidates.length && !vectorCandidates.length) return [];
    
    // 메인 추천 영화 ID 집합
    const mainMovieIds = new Set(recommendations.map(m => m.movie_id));
    
    // 겹치지 않는 후보들만 필터링
    const uniqueKeywordCandidates = keywordCandidates.filter(m => !mainMovieIds.has(m.movie_id));
    const uniqueVectorCandidates = vectorCandidates.filter(m => !mainMovieIds.has(m.movie_id));
    
    // 가중치 비율로 개수 계산 (총 5개)
    const totalCount = 5;
    const keywordCount = Math.round(totalCount * keywordWeight);
    const emotionCount = totalCount - keywordCount;
    
    // 각 후보군에서 선택
    const selectedKeyword = uniqueKeywordCandidates.slice(0, keywordCount);
    const selectedEmotion = uniqueVectorCandidates.slice(0, emotionCount);
    
    // 합치기
    const additional = [...selectedKeyword, ...selectedEmotion];
    
    // 5개가 안 되면 나머지로 채우기
    if (additional.length < totalCount) {
      const remaining = [...uniqueKeywordCandidates, ...uniqueVectorCandidates]
        .filter(m => !additional.find(a => a.movie_id === m.movie_id))
        .slice(0, totalCount - additional.length);
      additional.push(...remaining);
    }
    
    return additional.slice(0, totalCount);
  };

  const additionalRecommendations = getAdditionalRecommendations();

  const handleExplainClick = async (movie: Movie, e: React.MouseEvent) => {
    e.stopPropagation(); // 영화 카드 클릭 이벤트 방지
    
    // 이미 로딩 중이면 무시
    if (loadingExplanations[movie.movie_id]) return;
    
    // 이미 설명이 있으면 보이기/숨기기 토글
    if (expandedExplanations[movie.movie_id]) {
      setVisibleExplanations(prev => ({
        ...prev,
        [movie.movie_id]: !prev[movie.movie_id]
      }));
      return;
    }
    
    // LLM 설명 요청 (처음 한 번만)
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
      setVisibleExplanations(prev => ({
        ...prev,
        [movie.movie_id]: true
      }));
    } catch (err) {
      console.error('Explanation error:', err);
      setExpandedExplanations(prev => ({
        ...prev,
        [movie.movie_id]: '설명을 생성하는 중 오류가 발생했습니다.'
      }));
      setVisibleExplanations(prev => ({
        ...prev,
        [movie.movie_id]: true
      }));
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [movie.movie_id]: false }));
    }
  };

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
                <div key={movie.movie_id} className="movie-card" onClick={() => handleMovieClick(movie)}>
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
                    
                    {/* 만족도 확률 표시 */}
                    <div className="movie-satisfaction">
                      {movie.satisfaction_probability !== undefined ? (
                        <span className="satisfaction-label">
                          💝 내 취향 만족도: {(movie.satisfaction_probability * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="satisfaction-label satisfaction-login-required">
                          💝 로그인하셔야 만족도를 볼 수 있어요
                        </span>
                      )}
                    </div>
                    
                    {movie.reason && (
                      <p className="movie-reason">💡 {movie.reason}</p>
                    )}
                    
                    <button 
                      className="explain-btn"
                      onClick={(e) => handleExplainClick(movie, e)}
                      disabled={loadingExplanations[movie.movie_id]}
                    >
                      {loadingExplanations[movie.movie_id] ? (
                        <>⏳ 생성 중...</>
                      ) : visibleExplanations[movie.movie_id] ? (
                        <>📖 설명 닫기</>
                      ) : (
                        <>🤖 AI 상세 설명</>
                      )}
                    </button>
                    
                    {visibleExplanations[movie.movie_id] && expandedExplanations[movie.movie_id] && (
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

        {/* 추가 추천 섹션 */}
        {useOrchestrator && !isLoading && additionalRecommendations.length > 0 && (
          <div className="additional-recommendations-wrapper">
            <div className="additional-recommendations-header">
              <h2>✨ 비슷한 키워드 혹은 감성을 가진 영화들 또한 추천드려요</h2>
            </div>
            <div className="additional-movie-grid">
              {additionalRecommendations.map((movie) => (
                <div key={movie.movie_id} className="additional-movie-card" onClick={() => handleMovieClick(movie)}>
                  {movie.poster_url ? (
                    <img 
                      src={movie.poster_url} 
                      alt={movie.title}
                      className="additional-movie-poster"
                    />
                  ) : (
                    <div className="additional-movie-poster-placeholder">
                      🎬
                    </div>
                  )}
                  <div className="additional-movie-info">
                    <h3>{movie.title}</h3>
                    <p className="additional-movie-genres">{movie.genres.join(', ')}</p>
                    
                    {/* 만족도 확률 표시 */}
                    <div className="additional-movie-satisfaction">
                      {movie.satisfaction_probability !== undefined ? (
                        <span className="satisfaction-value">
                          💝 {(movie.satisfaction_probability * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="satisfaction-login-hint">
                          🔒 로그인 필요
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
