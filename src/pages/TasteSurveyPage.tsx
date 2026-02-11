import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

const genreLikeOptions = [ "로맨스/로코", "코미디", "드라마/휴먼", "스릴러/미스터리", "공포/호러", "액션", "범죄/느와르", "SF", "판타지", "애니메이션", "전쟁/역사", "다큐멘터리"];

const avoidNoneLabel =["🆗 없음 (다 잘 봐요!)"];

const genreAvoidOptions = ["로맨스/로코", "코미디", "드라마/휴먼", "스릴러/미스터리", "공포/호러", "액션", "범죄/느와르", "SF", "판타지", "애니메이션", "전쟁/역사", "다큐멘터리", avoidNoneLabel];

const contextOptions = [ "혼자 몰입파", "연인/친구와 함께", "가족과 오순도순", "자기 전 가볍게", "주말에 각 잡고 진득하게"];

const vibeOptions = [ "가볍고 유쾌한", "감동적이고 여운 남는", "충동적이고 파격적인", "잔잔하고 힐링되는", "철학적이고 생각하게 만드는", "어둡고 피폐한"];

const keywordOptions = [ "성장/청춘", "가족/우정", "전문직/직업물", "실화 기반", "디스토피아/아포칼립스", "타임루프/시간여행", "게임/가상세계", "본격 추리", "음악/예술", "스포츠"];

const originOptions = [ "한국 영화", "믹구/할리우드 영화", "일본 영화/애니", "유럽/기타 해외 영화", "고전 명작"];

export default function TasteSurveyPage() {
  const navigate = useNavigate();
  const [genres, setGenres] = useState<string[]>([]);
  const [avoidGenres, setAvoidGenres] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [vibe, setVibe] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");

  const toggleValue = (
    value: string,
    list: string[],
    setList: (next: string[]) => void
  ) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
      return;
    }
    setList([...list, value]);
  };

  const toggleValueWithLimit = (
    value: string,
    setList: (next: string[]) => void,
    limit: number
  ) => {
    setList((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      if (prev.length >= limit) return prev;
      return [...prev, value];
    });
  };

  const toggleAvoidGenre = (value: string) => {
    setAvoidGenres((prev) => {
      if (value === avoidNoneLabel) {
        return prev.includes(avoidNoneLabel) ? [] : [avoidNoneLabel];
      }
      const withoutNone = prev.filter((item) => item !== avoidNoneLabel);
      if (withoutNone.includes(value)) {
        return withoutNone.filter((item) => item !== value);
      }
      return [...withoutNone, value];
    });
  };

  const handleSubmit = () => {
    localStorage.setItem("mw_taste_genres", JSON.stringify(genres));
    localStorage.setItem("mw_taste_avoid_genres", JSON.stringify(avoidGenres));
    localStorage.setItem("mw_taste_context", context);
    localStorage.setItem("mw_taste_vibe", vibe);
    localStorage.setItem("mw_taste_keywords", JSON.stringify(keywords));
    localStorage.setItem("mw_tast_keyword", JSON.stringify(keywords));
    localStorage.setItem("mw_taste_origin", origin);
    navigate("/");
  };

  return (
    <MainLayout>
      <main className="container">
        <section className="page-title">
          <h1>취향 분석 설문</h1>
          <p>당신에게 맞는 영화를 추천하기 위해 간단한 질문을 할게요.</p>
        </section>

        <section className="section">
          <article className="card">
            <div className="form-grid centered">
              <div>
                <h4 className="filter-title">
                  가장 좋아하는 장르를 골라주세요. (최대 5개)
                </h4>
                <div className="tag-list">
                  {genreLikeOptions.map((genre) => (
                    <button
                      key={genre}
                      className={`filter-chip ${
                        genres.includes(genre) ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => toggleValueWithLimit(genre, setGenres, 5)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="filter-title">
                  이것만큼은 피하고 싶다! 절대 안 보는 장르는? (선택)
                </h4>
                <div className="tag-list">
                  {genreAvoidOptions.map((genre) => (
                    <button
                      key={`avoid-${genre}`}
                      className={`filter-chip ${
                        avoidGenres.includes(genre) ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => toggleAvoidGenre(genre)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="filter-title">
                  보통 영화를 언제, 어떻게 즐기시나요?
                </h4>
                <div className="tag-list">
                  {contextOptions.map((option) => (
                    <button
                      key={option}
                      className={`filter-chip ${context === option ? "active" : ""}`}
                      type="button"
                      onClick={() => setContext(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="filter-title">어떤 분위기의 영화가 땡기나요?</h4>
                <div className="tag-list">
                  {vibeOptions.map((option) => (
                    <button
                      key={option}
                      className={`filter-chip ${vibe === option ? "active" : ""}`}
                      type="button"
                      onClick={() => setVibe(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="filter-title">
                  특별히 꽂히는 소재가 있나요? (중복 선택)
                </h4>
                <div className="tag-list">
                  {keywordOptions.map((keyword) => (
                    <button
                      key={keyword}
                      className={`filter-chip ${
                        keywords.includes(keyword) ? "active" : ""
                      }`}
                      type="button"
                      onClick={() => toggleValue(keyword, keywords, setKeywords)}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="filter-title">주로 어떤 영화를 많이 보세요?</h4>
                <div className="tag-list">
                  {originOptions.map((option) => (
                    <button
                      key={option}
                      className={`filter-chip ${origin === option ? "active" : ""}`}
                      type="button"
                      onClick={() => setOrigin(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <button className="primary-btn" type="button" onClick={handleSubmit}>
                설문 완료하고 영화 추천 받기
              </button>
            </div>
          </article>
        </section>
      </main>
    </MainLayout>
  );
}
