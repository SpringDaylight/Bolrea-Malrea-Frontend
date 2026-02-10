import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

const genreOptions = ["로맨스", "드라마", "스릴러", "공포", "액션", "범죄", "SF", "판타지","코미디", "애니메이션", "역사", "다큐멘터리"];
const moodOptions = ["힐링/따뜻", "설렘/로맨틱", "짜릿/흥분", "쓸쓸/여운", "무서움/긴장", "통쾌/복수", "철학/사회"]; //"편안한", "감성적인", "몰입감 있는", "짜릿한", "유쾌한"
const endingOptions = ["해피엔딩이 좋아요", "열린결말이 좋아요", "배드엔딩이 좋아요", "반전/충격 결말이 좋아요"]
const keywordOptions = ["성장/청춘","가족/우정","직업물","실화 기반","디스토피아/포스트아포칼립스","타임루프/시간여행","게임/가상세계","추리/미스테리","음악/예술","스포츠"]

export default function TasteSurveyPage() {
  const navigate = useNavigate();
  const [moods, setMoods] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [watchTime, setWatchTime] = useState("90");
  const [endings, setEndings] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

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

  const handleSubmit = () => {
    localStorage.setItem("mw_taste_moods", JSON.stringify(moods));
    localStorage.setItem("mw_taste_genres", JSON.stringify(genres));
    localStorage.setItem("mw_taste_watch_time", watchTime);
    localStorage.setItem("mw_taste_ending", JSON.stringify(endings));
    localStorage.setItem("mw_tast_keyword", JSON.stringify(keywords));
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
                <h4 className="filter-title">좋아하는 장르</h4>
                <div className="tag-list">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      className={`filter-chip ${genres.includes(genre) ? "active" : ""}`}
                      type="button"
                      onClick={() => toggleValue(genre, genres, setGenres)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="filter-title">선호하는 분위기</h4>
                <div className="tag-list">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood}
                      className={`filter-chip ${moods.includes(mood) ? "active" : ""}`}
                      type="button"
                      onClick={() => toggleValue(mood, moods, setMoods)}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="filter-title">선호 러닝타임</h4>
                <div className="tag-list">
                  {["90", "120", "150"].map((time) => (
                    <button
                      key={time}
                      className={`filter-chip ${watchTime === time ? "active" : ""}`}
                      type="button"
                      onClick={() => setWatchTime(time)}
                    >
                      {time}분 내외
                    </button>
                  ))}
                </div>
              </div>
                                          
              <div>
                <h4 className="filter-title">선호하는 결말</h4>
                <div className="tag-list">
                  {endingOptions.map((ending) => (
                    <button
                      key={ending}
                      className={`filter-chip ${endings.includes(ending) ? "active" : ""}`}
                      type="button"
                      onClick={() => toggleValue(ending, endings, setEndings)}
                    >
                      {ending}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="filter-title">좋아하는 소재/키워드</h4>
                <div className="tag-list">
                  {keywordOptions.map((keyword) => (
                    <button
                      key={keyword}
                      className={`filter-chip ${keywords.includes(keyword) ? "active" : ""}`}
                      type="button"
                      onClick={() => toggleValue(keyword, keywords, setKeywords)}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>

              <button className="primary-btn" type="button" onClick={handleSubmit}>
                설문 완료하고 추천 받기
              </button>
            </div>
          </article>
        </section>
      </main>
    </MainLayout>
  );
}






