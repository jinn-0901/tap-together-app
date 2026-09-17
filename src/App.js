import "./App.css";
import { useState } from "react";

const CATEGORIES = [
  { id: "coffee", label: "☕ 커피" },
  { id: "latte", label: "🥛 라떼" },
  { id: "tea", label: "🍵 차" },
  { id: "ade", label: "🍹 에이드" },
];

const MENU = [
  { id: "americano", name: "아메리카노", price: 3000, category: "coffee", icon: "☕" },
  { id: "cafe-latte", name: "카페라떼", price: 3500, category: "latte", icon: "🥛" },
  { id: "strawberry-latte", name: "딸기라떼", price: 4500, category: "latte", icon: "🍓" },
  { id: "choco-latte", name: "초코라떼", price: 4500, category: "latte", icon: "🍫" },
  { id: "green-tea", name: "녹차", price: 3500, category: "tea", icon: "🍵" },
  { id: "yuja-tea", name: "유자차", price: 4000, category: "tea", icon: "🍊" },
  { id: "iced-tea", name: "아이스티", price: 3500, category: "tea", icon: "🧊" },
  { id: "lemonade", name: "레모네이드", price: 4000, category: "ade", icon: "🍋" },
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState("coffee");
  const [toast, setToast] = useState(null);

  const filteredMenu = MENU.filter((item) => item.category === activeCategory);

  const handleSelect = (item) => {
    setToast(item);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="kiosk">
      <div className="kiosk-card">
        <h1>☕ 우리 카페 키오스크</h1>
        <p className="subtitle">메뉴를 선택해주세요</p>

        <div className="tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`tab ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="menu-grid">
          {filteredMenu.map((item) => (
            <button key={item.id} className="menu-item" onClick={() => handleSelect(item)}>
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-name">{item.name}</span>
              <span className="menu-price">{item.price.toLocaleString()}원</span>
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span className="toast-icon">{toast.icon}</span>
          <span>{toast.name} 선택되었습니다</span>
        </div>
      )}
    </div>
  );
}