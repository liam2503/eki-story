export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <div className="w-4/5 h-[8vh] sm:h-[6vh] bg-white flex items-center justify-center px-8 py-5 shadow-md fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full z-20">
      <div className="flex flex-grow items-center space-x-5 justify-center">
        {/* Feed */}
        <button
          onClick={() => onTabChange("feed")}
          className={`group w-[5vh] h-[5vh] rounded-full flex items-center justify-center transition cursor-pointer ${activeTab === "feed" ? "bg-[#2BAAE2]" : "hover:bg-[#2BAAE2]"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`h-[3.5vh] transition stroke-current ${activeTab === "feed" ? "text-white" : "text-[#2BAAE2] group-hover:text-white"}`}>
            <path d="M3 10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H13C16.7712 2 18.6569 2 19.8284 3.17157C21 4.34315 21 6.22876 21 10V14C21 17.7712 21 19.6569 19.8284 20.8284C18.6569 22 16.7712 22 13 22H11C7.22876 22 5.34315 22 4.17157 20.8284C3 19.6569 3 17.7712 3 14V10Z" strokeWidth="1.5"/>
            <path d="M6 12C6 10.5858 6 9.87868 6.43934 9.43934C6.87868 9 7.58579 9 9 9H15C16.4142 9 17.1213 9 17.5607 9.43934C18 9.87868 18 10.5858 18 12V16C18 17.4142 18 18.1213 17.5607 18.5607C17.1213 19 16.4142 19 15 19H9C7.58579 19 6.87868 19 6.43934 18.5607C6 18.1213 6 17.4142 6 16V12Z" strokeWidth="1.5"/>
            <path d="M7 6H12" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Map (center/home) */}
        <button
          onClick={() => onTabChange("map")}
          className={`group w-[6vh] h-[6vh] rounded-full flex items-center justify-center transition cursor-pointer ${activeTab === "map" ? "bg-[#EEEEEE]" : "bg-[#ed2079] hover:bg-[#EEEEEE]"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`h-[4vh] transition stroke-current ${activeTab === "map" ? "text-[#ed2079]" : "text-white group-hover:text-[#ed2079]"}`}>
            <path d="M5.7 15C4.03377 15.6353 3 16.5205 3 17.4997C3 19.4329 7.02944 21 12 21C16.9706 21 21 19.4329 21 17.4997C21 16.5205 19.9662 15.6353 18.3 15M12 9H12.01M18 9C18 13.0637 13.5 15 12 18C10.5 15 6 13.0637 6 9C6 5.68629 8.68629 3 12 3C15.3137 3 18 5.68629 18 9ZM13 9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9C11 8.44772 11.4477 8 12 8C12.5523 8 13 8.44772 13 9Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Lines list */}
        <button
          onClick={() => onTabChange("lines")}
          className={`group w-[5vh] h-[5vh] rounded-full flex items-center justify-center transition cursor-pointer ${activeTab === "list" ? "bg-[#fbb03c]" : "hover:bg-[#fbb03c]"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`h-[3vh] transition stroke-current ${activeTab === "list" ? "text-white" : "text-[#fbb03c] group-hover:text-white"}`}>
            <path d="M8 6.00067L21 6.00139M8 12.0007L21 12.0015M8 18.0007L21 18.0015M3.5 6H3.51M3.5 12H3.51M3.5 18H3.51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="absolute flex items-center right-4">
        <button
          onClick={() => onTabChange("profile")}
          className={`group w-[5vh] h-[5vh] rounded-full flex items-center justify-center transition cursor-pointer ${activeTab === "profile" ? "bg-[#444444]" : "hover:bg-[#444444]"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-[3.5vh] transition ${activeTab === "profile" ? "text-white" : "text-black group-hover:text-white"}`}>
            <path d="M18 20a6 6 0 0 0-12 0" />
            <circle cx="12" cy="10" r="4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
