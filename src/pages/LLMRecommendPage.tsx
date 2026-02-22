import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendMovies, type Movie } from '../api/llmRecommend';
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
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const [useOrchestrator, setUseOrchestrator] = useState(false);
  const [keywordCandidates, setKeywordCandidates] = useState<Movie[]>([]);
  const [vectorCandidates, setVectorCandidates] = useState<Movie[]>([]);
  const [keywordWeight, setKeywordWeight] = useState<number>(0);
  const [emotionWeight, setEmotionWeight] = useState<number>(0);

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
          setUseOrchestrator(state.useOrchestrator);
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

  const handleRecommend = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setRecommendations([]);
    setExplanation('');
    setKeywordCandidates([]);
    setVectorCandidates([]);

    try {
      const response = await recommendMovies({
        user_input: input.trim(),
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

  const handleMovieClick = (movie: Movie) => {
    navigate(movie.detail_url);
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

  return (
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
            
            {/* 오케스트레이터 옵션 */}
            <div className="orchestrator-option">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useOrchestrator}
                  onChange={(e) => setUseOrchestrator(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="checkbox-text">
                  🎯 고급 추천 모드 (오케스트레이터)
                  <span className="option-hint">
                    더 정확하지만 느림 (2-3배 시간 소요)
                  </span>
                </span>
              </label>
            </div>
            
            <button 
              onClick={handleRecommend} 
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
                <div 
                  key={movie.movie_id} 
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
                    {/* 상세 점수 정보 (오케스트레이터 모드) */}
                    {useOrchestrator && movie.final_score !== undefined && (
                      <div className="score-details">
                        <div className="score-breakdown">
                          <div className="score-item">
                            <span className="score-label">최종 점수:</span>
                            <span className="score-value">{(movie.final_score * 100).toFixed(1)}%</span>
                          </div>
                          {movie.keyword_score !== undefined && movie.keyword_score > 0 && (
                            <div className="score-item">
                              <span className="score-label">└ 키워드:</span>
                              <span className="score-value">{(movie.keyword_score * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {movie.emotion_score !== undefined && movie.emotion_score > 0 && (
                            <div className="score-item">
                              <span className="score-label">└ 감성:</span>
                              <span className="score-value">{(movie.emotion_score * 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {movie.sources && movie.sources.length > 0 && (
                            <div className="score-item">
                              <span className="score-label">검색 소스:</span>
                              <span className="score-value">
                                {movie.sources.map(s => s === 'keyword' ? '🔍' : '🎭').join(' ')}
                              </span>
                            </div>
                          )}
                        </div>
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
  );
}
