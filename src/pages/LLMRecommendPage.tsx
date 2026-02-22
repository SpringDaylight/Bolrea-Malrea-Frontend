import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendMovies, type Movie } from '../api/llmRecommend';
import '../styles/LLMRecommendPage.css';

export default function LLMRecommendPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const [useOrchestrator, setUseOrchestrator] = useState(false); // 오케스트레이터 옵션

  const handleRecommend = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setRecommendations([]);
    setExplanation('');

    try {
      const response = await recommendMovies({
        user_input: input.trim(),
        top_k: 5,
        use_orchestrator: useOrchestrator // 오케스트레이터 사용 여부
      });

      setRecommendations(response.recommendations);
      setExplanation(response.explanation);
    } catch (err) {
      console.error('Recommendation error:', err);
      setError(err instanceof Error ? err.message : '추천에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
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
                      <span>{(movie.similarity_score * 100).toFixed(0)}% 일치</span>
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
  );
}
