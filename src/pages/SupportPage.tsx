import { NavLink, useLocation } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

type SupportItem = {
  id: number;
  question: string;
};

const noticeList: SupportItem[] = [
  { id: 101, question: "시스템 점검 안내 (2/15)" },
  { id: 102, question: "신규 기능 업데이트 안내" },
  { id: 103, question: "이용약관 개정 사전 안내" },
];

const inquiryList: SupportItem[] = [
  { id: 201, question: "로그인 문제가 있어요." },
  { id: 202, question: "리뷰 삭제가 안 돼요." },
  { id: 203, question: "계정 정보 변경 문의" },
];

const faqList: SupportItem[] = [
  { id: 301, question: "비밀번호를 잊어버렸어요." },
  { id: 302, question: "취향 분석은 어떻게 하나요?" },
  { id: 303, question: "프로필 정보는 어디서 변경하나요?" },
];

export default function SupportPage() {
  const { pathname } = useLocation();
  const isNotice = pathname === "/notice";
  const isInquiry = pathname === "/inquiry";
  const items = isNotice ? noticeList : isInquiry ? inquiryList : faqList;
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "active" : undefined;

  return (
    <MainLayout>
      <main className="container">
        <section className="section card support-card">
          <div className="section-header one-line support-header">
            {/* <h2>{isNotice ? "공지사항" : isInquiry ? "문의하기" : "FAQ"}</h2> */}
            <div className="support-tabs" role="tablist" aria-label="고객센터 탭">
              <NavLink to="/notice" className={navClass} role="tab">
                공지사항
              </NavLink>
              <NavLink to="/inquiry" className={navClass} role="tab">
                문의하기
              </NavLink>
              <NavLink to="/faq" className={navClass} role="tab">
                FAQ
              </NavLink>
            </div>
          </div>

          <div className="support-table">
            <div className="support-row support-head">
              <span>번호</span>
              <span>질문</span>
              <span>보기</span>
            </div>
            {items.map((item) => (
              <div className="support-row" key={item.id}>
                <span>{item.id}</span>
                <span>{item.question}</span>
                <span>›</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
