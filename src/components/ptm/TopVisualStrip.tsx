export default function TopVisualStrip() {
  return (
    <section
      className="h-20 sm:h-28 lg:h-36 w-full bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500 relative overflow-hidden"
      aria-hidden="true"
    >
      {/* Subtle pattern background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        viewBox="0 0 1200 150"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="dots" x="0" y="0" width="100" height="150" patternUnits="userSpaceOnUse">
            <circle cx="50" cy="50" r="2" fill="white" opacity="0.6" />
            <circle cx="50" cy="100" r="2" fill="white" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="1200" height="150" fill="url(#dots)" />
      </svg>

      {/* Decorative icons */}
      <div className="absolute inset-0 flex items-center justify-center gap-8 sm:gap-12 lg:gap-16 px-4">
        {/* Document icon */}
        <svg
          className="w-10 h-10 sm:w-14 sm:h-14 lg:w-20 lg:h-20 text-white opacity-30 hover:opacity-50 transition"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        {/* Checkmark icon */}
        <svg
          className="w-10 h-10 sm:w-14 sm:h-14 lg:w-20 lg:h-20 text-white opacity-40 hover:opacity-60 transition"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>

        {/* Magnifying glass icon */}
        <svg
          className="w-10 h-10 sm:w-14 sm:h-14 lg:w-20 lg:h-20 text-white opacity-30 hover:opacity-50 transition"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
    </section>
  );
}
