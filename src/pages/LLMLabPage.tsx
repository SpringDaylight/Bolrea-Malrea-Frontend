import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendChatMessage, getSystemPrompts } from '../api/llmChat';
import { recommendMovies, type Movie } from '../api/llmRecommend';
import type { ChatMessage, SystemPrompt } from '../api/llmChat';
import '../styles/LLMLabPage.css';

export default function LLMLabPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<'chat' | 'recommend'>('chat');
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [explanation, setExplanation] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSystemPrompts();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSystemPrompts = async () => {
    try {
      const data = await getSystemPrompts();
      setSystemPrompts(data.prompts);
      if (data.prompts.length > 0) {
        setSelectedPrompt(data.prompts[0].prompt);
      }
    } catch (error) {
      console.error('Failed to load system prompts:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (mode === 'recommend') {
      // 추천 모드
      setIsLoading(true);
      try {
        const response = await recommendMovies({
          user_input: input.trim(),
          top_k: 5
        });

        setRecommendations(response.recommendations);
        setExplanation(response.explanation);
      } catch (error) {
        console.error('Recommendation error:', error);
        setExplanation(`오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      // 채팅 모드
      const userMessage: ChatMessage = {
        role: 'user',
        content: input.trim()
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setIsLoading(true);

      try {
        const response = await sendChatMessage({
          messages: newMessages,
          system_prompt: customPrompt || selectedPrompt,
          temperature,
          max_tokens: 2000
        });

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response
        };

        setMessages([...newMessages, assistantMessage]);
      } catch (error) {
        console.error('Chat error:', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
        };
        setMessages([...newMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setRecommendations([]);
    setExplanation('');
  };

  return (
    <div className="llm-lab-page">
      <div className="llm-lab-container">
        <div className="llm-lab-header">
          <h1>🎬 LLM Lab - 영화 추천 실험실</h1>
          <p>자연어로 대화하며 영화 추천 방식을 테스트해보세요</p>
          
          <div className="mode-selector">
            <button 
              className={mode === 'chat' ? 'active' : ''}
              onClick={() => setMode('chat')}
            >
              💬 채팅 모드
            </button>
            <button 
              className={mode === 'recommend' ? 'active' : ''}
              onClick={() => setMode('recommend')}
            >
              🎯 추천 모드
            </button>
          </div>
          
          <div className="header-actions">
            <button onClick={() => setShowSettings(!showSettings)} className="settings-btn">
              ⚙️ 설정
            </button>
            <button onClick={clearChat} className="clear-btn">
              🗑️ 초기화
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="settings-panel">
            <div className="setting-group">
              <label>시스템 프롬프트 선택</label>
              <select 
                value={selectedPrompt} 
                onChange={(e) => setSelectedPrompt(e.target.value)}
              >
                {systemPrompts.map((prompt, idx) => (
                  <option key={idx} value={prompt.prompt}>
                    {prompt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label>커스텀 시스템 프롬프트 (선택사항)</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="커스텀 프롬프트를 입력하면 위의 선택된 프롬프트 대신 사용됩니다"
                rows={3}
              />
            </div>

            <div className="setting-group">
              <label>Temperature: {temperature}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
              <small>낮을수록 일관적, 높을수록 창의적</small>
            </div>
          </div>
        )}

        <div className="chat-container">
          <div className="messages-area">
            {messages.length === 0 && (
              <div className="welcome-message">
                <h2>👋 환영합니다!</h2>
                <p>영화 추천에 대해 자유롭게 대화해보세요.</p>
                <div className="example-prompts">
                  <p><strong>예시:</strong></p>
                  <ul>
                    <li>"우울한 기분을 달래줄 영화 추천해줘"</li>
                    <li>"설레는 로맨스 영화가 보고 싶어"</li>
                    <li>"반전이 있는 스릴러 추천해줘"</li>
                    <li>"가족과 함께 볼 만한 따뜻한 영화"</li>
                  </ul>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요... (Shift+Enter: 줄바꿈, Enter: 전송)"
              rows={3}
              disabled={isLoading}
            />
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              className="send-btn"
            >
              {isLoading ? '전송 중...' : '전송'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
