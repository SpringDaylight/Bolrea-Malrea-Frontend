import Header from "./Header";
import BottomNav from "./BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <BottomNav />
    </>
  );
}