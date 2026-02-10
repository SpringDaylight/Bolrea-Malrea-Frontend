import { useState } from "react";
import MainLayout from "../components/layout/MainLayout";

export default function GroupPage() {
  const [groupType, setGroupType] = useState("개인");
  const [userQuery, setUserQuery] = useState("");
  const userResults = [
    { id: "mirae_01", name: "미래", nickname: "미래" },
    { id: "noir_02", name: "노을", nickname: "노을빛" },
    { id: "summer_03", name: "여름", nickname: "summer" },
  ].filter((user) => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return false;
    return (
      user.name.toLowerCase().includes(query) ||
      user.nickname.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  });
  return (
    <MainLayout>
      <main className="container">
        <section className="page-title">
          <h1>모두가 만족할 영화 찾기</h1>
          <p>모임 구성원들의 취향을 합쳐 한 번에 정리해드려요.</p>
        </section>

        <section className="section card">
          <div className="form-grid">
            <label>그룹 선택</label>
            <select
              value={groupType}
              onChange={(event) => setGroupType(event.target.value)}
            >
              <option>친구</option>
              <option>가족</option>
              <option>연인</option>
              <option>기타</option>
            </select>
            {groupType !== "" && (
              <>
                <label>사용자 검색</label>
                <input
                  type="text"
                  placeholder="사용자 이름/닉네임/아이디 검색"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                />
                {userQuery.trim().length > 0 && (
                  <div className="search-results">
                    {userResults.length == 0 && (
                      <div className="search-empty">검색 결과가 없습니다.</div>
                    )}
                    {userResults.map((user) => (
                      <button className="search-item" type="button" key={user.id}>
                        <strong>{user.nickname}</strong>
                        <span>{user.name}</span>
                        <span className="muted">@{user.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <label>영화 선택</label>
            <input type="text" placeholder="영화 제목 입력" />
            <button className="primary-btn">분석하기</button>
          </div>
        </section>

        <section className="section">
          <article className="card">
            <div className="movie-tile">
              <img
                className="poster"
                src="https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"
                alt="기생충 포스터"
              />
              <div className="movie-info">
                <h3>기생충</h3>
                <p className="probability">그룹 만족 확률 67%</p>
                <p className="muted">
                  사회적 메시지와 서스펜스 모두 충족하는 선택지예요.
                </p>
              </div>
            </div>

            <div className="section" style={{ marginTop: 16 }}>
              <h3>멤버별 예상 반응</h3>
              <ul className="list">
                <li>A님: 매우 만족</li>
                <li>B님: 무난</li>
                <li>C님: 다소 지루</li>
              </ul>
            </div>

            <div className="section" style={{ marginTop: 16 }}>
              <h3>해석 요약</h3>
              <p className="muted">
                공통적으로 사회적 풍자와 관계 중심 서사를 선호하지만, 템포
                취향은 다릅니다.
              </p>
            </div>

            <button className="secondary-btn" style={{ marginTop: 18 }}>
              대안 영화 보기
            </button>
          </article>
        </section>
      </main>
    </MainLayout>
  );
}
