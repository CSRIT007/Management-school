export default function Header({ onToggleSidebar }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b border-gray-200">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.75 6.75h16.5v1.5H3.75v-1.5zm0 4.5h16.5v1.5H3.75v-1.5zm0 4.5h16.5v1.5H3.75v-1.5z" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#4361ee] text-white grid place-items-center font-bold">M</div>
          <div className="font-semibold text-lg tracking-tight">Management</div>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search…"
              className="pl-10 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4361ee]/20 focus:border-[#4361ee] text-sm"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 015.132 11.205l4.206 4.207-1.061 1.06-4.206-4.206A6.75 6.75 0 1110.5 3.75zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <button className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50" title="Notifications">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6zm0 20a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4361ee] to-[#8bb1ff] grid place-items-center text-white font-semibold">KH</div>
        </div>
      </div>
    </header>
  )
}

