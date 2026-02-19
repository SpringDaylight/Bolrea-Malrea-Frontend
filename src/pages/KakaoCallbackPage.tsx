// import { useEffect, useState, useRef } from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
// import { handleKakaoCallback } from "../api/auth";

export default function KakaoCallbackPage() {
  return (
    <MainLayout>
      <main className="container">
        <section className="page-title centered">
          <h1>카카오 로그인은 현재 사용하지 않습니다.</h1>
        </section>
      </main>
    </MainLayout>
  );
}
