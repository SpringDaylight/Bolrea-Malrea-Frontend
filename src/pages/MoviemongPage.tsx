import { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import "../components/roulette/roulette.css";
import moviemong1 from "../assets/reviewmong_1.png";
import Roulette from "../components/roulette/Roulette";
import { rouletteItems } from "../components/roulette/rouletteItems";

type QuestionItem = {
  id: number;
  question: string;
  createdAt: string;
  answer: string;
};

const QUESTION_PAGE_SIZE = 10;
const questionItems: QuestionItem[] = Array.from({ length: 32 }, (_, index) => {
  const day = String((index % 28) + 1).padStart(2, "0");
  return {
    id: index + 1,
    question: `질문 내용 ${index + 1}번입니다.`,
    createdAt: `2026-02-${day}`,
    answer: `내 답변 내용 ${index + 1}번입니다.`,
  };
});

export default function MoviemongPage() {
  const getNextExpRequirement = (nextLevel: number) => {
    if (nextLevel <= 1) return 0;
    if (nextLevel <= 5) return 50 * (nextLevel - 1);
    if (nextLevel <= 10) return 300 + 50 * (nextLevel - 6);
    if (nextLevel <= 15) return 500 + 60 * (nextLevel - 10);
    if (nextLevel <= 20) return 800 + 40 * (nextLevel - 15);
    if (nextLevel <= 25) return 1000 + 100 * (nextLevel - 20);
    if (nextLevel <= 30) return 1500 + 100 * (nextLevel - 25);
    return 2000;
  };

  const [activeTab, setActiveTab] = useState<
    "question" | "feed" | "theme" | "recipe" | "bag"
  >("question");
  const [level, setLevel] = useState(1);
  const [popcornCount, setPopcornCount] = useState(0);
  const [expValue, setExpValue] = useState(0);
  const [questionPage, setQuestionPage] = useState(1);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(
    null
  );
  const [questionQuery, setQuestionQuery] = useState("");
  const expMax = getNextExpRequirement(level + 1);
  const expPercent =
    expMax > 0 ? Math.min(100, Math.round((expValue / expMax) * 100)) : 0;
  const normalizedQuery = questionQuery.trim().toLowerCase();
  const filteredQuestions = questionItems.filter((item) => {
    if (!normalizedQuery) return true;
    return (
      item.question.toLowerCase().includes(normalizedQuery) ||
      item.answer.toLowerCase().includes(normalizedQuery)
    );
  });
  const totalQuestionPages = Math.max(
    1,
    Math.ceil(filteredQuestions.length / QUESTION_PAGE_SIZE)
  );
  const safeQuestionPage = Math.min(questionPage, totalQuestionPages);
  const pagedQuestions = filteredQuestions.slice(
    (safeQuestionPage - 1) * QUESTION_PAGE_SIZE,
    safeQuestionPage * QUESTION_PAGE_SIZE
  );
  const hasQuestions = filteredQuestions.length > 0;
  const rangeStart = hasQuestions
    ? (safeQuestionPage - 1) * QUESTION_PAGE_SIZE + 1
    : 0;
  const rangeEnd = hasQuestions
    ? Math.min(safeQuestionPage * QUESTION_PAGE_SIZE, filteredQuestions.length)
    : 0;

  const handleRouletteResult = (item: typeof rouletteItems[number]) => {
    const currentExpMax = expMax;
    setPopcornCount((prev) => prev + item.popcornGain);
    setExpValue((prev) => {
      const nextValue = prev + item.expGain;
      if (currentExpMax > 0 && nextValue >= currentExpMax) {
        setLevel((current) => current + 1);
        return 0;
      }
      return nextValue;
    });
  };

  return (
    <MainLayout>
      <main className="container reviewmong-page">
        <section className="section">
          <div className="reviewmong-hero">
            <div className="reviewmong-stats">
              <span>레벨 {level}</span>
              <span>팝콘 {popcornCount}</span>
            </div>
            <div className="reviewmong-hero-content">
              <img src={moviemong1} alt="Moviemong preview" />
              <div className="reviewmong-exp">
                <div className="reviewmong-exp-header">
                  <span>EXP</span>
                  <span>
                    {expValue}/{expMax}
                  </span>
                </div>
                <div className="reviewmong-exp-bar">
                  <span style={{ width: `${expPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="reviewmong-actions">
            <button
              className={`secondary-btn ${
                activeTab === "question" ? "is-active" : ""
              }`}
              type="button"
              onClick={() => setActiveTab("question")}
            >
              질문
            </button>
            <button
              className={`secondary-btn ${activeTab === "feed" ? "is-active" : ""}`}
              type="button"
              onClick={() => setActiveTab("feed")}
            >
              밥주기
            </button>
            <button
              className={`secondary-btn ${activeTab === "theme" ? "is-active" : ""}`}
              type="button"
              onClick={() => setActiveTab("theme")}
            >
              테마
            </button>
            <button
              className={`secondary-btn ${
                activeTab === "recipe" ? "is-active" : ""
              }`}
              type="button"
              onClick={() => setActiveTab("recipe")}
            >
              취향 레시피
            </button>
            <button
              className={`secondary-btn ${activeTab === "bag" ? "is-active" : ""}`}
              type="button"
              onClick={() => setActiveTab("bag")}
            >
              내 가방
            </button>
          </div>
          <div className="reviewmong-panel">
            {activeTab === "question" && (
              <div className="reviewmong-question">
                <p className="question-title">오늘의 질문?</p>
                <p className="question-text">
                  Q1. 태어나서 처음으로 극장에서 봤던 영화, 어렴풋이 기억나요?
                </p>
                <textarea
                  className="question-input"
                  placeholder="답변(100bytes)"
                  maxLength={100}
                />
                <div className="question-actions">
                  <button className="primary-btn question-submit-btn" type="button">
                    답변하기
                  </button>
                </div>
                <div className="question-history">
                  <div className="question-history-header">
                    <span>내 질문 목록</span>
                    <span>
                      {filteredQuestions.length}개 중 {rangeStart}-{rangeEnd}개
                    </span>
                  </div>
                  <div className="question-list">
                    {pagedQuestions.map((item) => {
                      const isOpen = expandedQuestionId === item.id;
                      return (
                        <div className="question-item" key={item.id}>
                          <button
                            className="question-item-header"
                            type="button"
                            onClick={() =>
                              setExpandedQuestionId((prev) =>
                                prev === item.id ? null : item.id
                              )
                            }
                          >
                            <span className="question-item-number">Q{item.id}.</span>
                            <span className="question-item-text">{item.question}</span>
                            <span className="question-item-date">{item.createdAt}</span>
                          </button>
                          {isOpen && (
                            <div className="question-item-answer">
                              <span className="question-item-answer-label">내 답변</span>
                              <p>{item.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {totalQuestionPages > 1 && (
                    <div className="question-pagination">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() =>
                          setQuestionPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={safeQuestionPage === 1}
                      >
                        이전
                      </button>
                      {Array.from(
                        { length: totalQuestionPages },
                        (_, index) => index + 1
                      ).map((page) => (
                        <button
                          key={page}
                          type="button"
                          className={`secondary-btn ${
                            page === safeQuestionPage ? "is-active" : ""
                          }`}
                          onClick={() => setQuestionPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() =>
                          setQuestionPage((prev) =>
                            Math.min(totalQuestionPages, prev + 1)
                          )
                        }
                        disabled={safeQuestionPage === totalQuestionPages}
                      >
                        다음
                      </button>
                    </div>
                  )}
                  <div className="question-search">
                    <input
                      type="text"
                      value={questionQuery}
                      onChange={(event) => {
                        setQuestionQuery(event.target.value);
                        setQuestionPage(1);
                      }}
                      placeholder="질문/답변 검색"
                    />
                    <button
                      type="button"
                      className="primary-btn question-search-btn"
                      onClick={() => setQuestionPage(1)}
                    >
                      검색
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "feed" && (
              <Roulette items={rouletteItems} onResult={handleRouletteResult} />
            )}
            {activeTab === "theme" &&(
              <div className="reviewmong-question">
                <p className="question-title">테마</p>
                <p className="question-text">준비 중이에요.</p>
              </div>
            )}
            {activeTab === "recipe" && (
              <div className="reviewmong-question">
                <p className="question-title">취향 레시피</p>
                <p className="question-text">준비 중이에요.</p>
              </div>
            )}
            {activeTab === "bag" && (
              <div className="reviewmong-question">
                <p className="question-title">내 가방</p>
                <p className="question-text">준비 중이에요.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
