import { useState } from "react";
import MainLayout from "../components/layout/MainLayout";

export default function ChatPage() {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { id: number; role: "assistant" | "user"; text: string }[]
  >([
    {
      id: 1,
      role: "assistant",
      text: "안녕하세요! 어떤 분위기의 영화를 찾고 계신가요?",
    },
  ]);

  const handleChatSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", text: trimmed },
      {
        id: Date.now() + 1,
        role: "assistant",
        text: "좋아요! 해당 분위기에 맞는 영화를 찾아볼게요. 원하는 장르나 길이가 있다면 알려주세요.",
      },
    ]);
    setChatInput("");
  };

  return (
    <MainLayout>
      <main className="container">
        <section className="hero">
          <div>
            <h1>대화로 추천 받아보기</h1>
            <p>편하게 말해주면 분위기에 맞는 영화를 추천해드려요.</p>
            <div className="hero-chat">
              <div className="chat-thread">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>
              <div className="chat-input-row">
                <input
                  className="search-input"
                  type="text"
                  placeholder="예: 따뜻한 가족 영화, 100분 이내"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                />
                <button className="primary-btn" type="button" onClick={handleChatSend}>
                  보내기
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
