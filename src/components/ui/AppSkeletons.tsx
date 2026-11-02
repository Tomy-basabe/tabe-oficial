import React from "react";
import { cn } from "@/lib/utils";

/**
 * Base Shimmer Skeleton Element with subtle pulse and border matching Notion / Linear style
 */
export function SkeletonBlock({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse bg-zinc-200/70 dark:bg-zinc-800/70 rounded-lg",
        className
      )}
      {...props}
    />
  );
}

/**
 * ── DASHBOARD SKELETON ──
 * Matches exactly the 12-column Bento Grid layout of Dashboard.tsx (Col 8 + Col 4)
 */
export function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        {/* Left Side (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-5 lg:gap-6">
          {/* Bento Header */}
          <div className="neo-bento-card p-6 lg:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-2 w-full sm:w-auto">
              <SkeletonBlock className="h-7 w-48 sm:w-64" />
              <SkeletonBlock className="h-4 w-36 sm:w-44" />
            </div>
            <SkeletonBlock className="h-9 w-28 rounded-lg shrink-0" />
          </div>

          {/* Metric Stats Cards (4 items) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="neo-bento-card p-4 h-[105px] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <SkeletonBlock className="h-4 w-16" />
                  <SkeletonBlock className="h-6 w-6 rounded-md" />
                </div>
                <SkeletonBlock className="h-7 w-20" />
              </div>
            ))}
          </div>

          {/* Academic Status / Carrera Progress Card */}
          <div className="neo-bento-card p-6 h-[190px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <SkeletonBlock className="h-5 w-44" />
                <SkeletonBlock className="h-3.5 w-32" />
              </div>
              <SkeletonBlock className="h-8 w-24 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-4 w-12" />
              </div>
              <SkeletonBlock className="h-3 w-full rounded-full" />
            </div>
          </div>

          {/* Recent Subjects Card */}
          <div className="neo-bento-card p-6 h-[240px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-100/60 dark:bg-zinc-800/40">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="w-8 h-8 rounded-lg shrink-0" />
                    <div className="space-y-1.5">
                      <SkeletonBlock className="h-4 w-36 sm:w-52" />
                      <SkeletonBlock className="h-3 w-20" />
                    </div>
                  </div>
                  <SkeletonBlock className="h-6 w-16 rounded-md shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-5 lg:gap-6">
          {/* Focus / Pomodoro Widget */}
          <div className="neo-bento-card p-5 h-[230px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="w-6 h-6 rounded-md" />
            </div>
            <div className="flex flex-col items-center justify-center my-auto space-y-3">
              <SkeletonBlock className="h-12 w-32 rounded-xl" />
              <SkeletonBlock className="h-8 w-24 rounded-lg" />
            </div>
          </div>

          {/* Upcoming Exams Widget */}
          <div className="neo-bento-card p-5 h-[280px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-100/60 dark:bg-zinc-800/40 flex items-center justify-between">
                  <div className="space-y-1">
                    <SkeletonBlock className="h-4 w-32" />
                    <SkeletonBlock className="h-3 w-20" />
                  </div>
                  <SkeletonBlock className="h-6 w-14 rounded-md shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Widget */}
          <div className="neo-bento-card p-5 h-[160px] flex flex-col justify-between">
            <SkeletonBlock className="h-5 w-28 mb-3" />
            <div className="grid grid-cols-2 gap-2.5">
              <SkeletonBlock className="h-10 rounded-xl" />
              <SkeletonBlock className="h-10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ── CAREER PLAN SKELETON ──
 * Matches exactly the layout of CareerPlan.tsx (Header + Progress banner + Filters + Subject Cards)
 */
export function CareerPlanSkeleton() {
  return (
    <div className="tabe-page p-4 lg:p-8 space-y-6 select-none">
      {/* Header */}
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <SkeletonBlock className="w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-6 w-48 sm:w-64" />
            <SkeletonBlock className="h-4 w-36 sm:w-48" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Progress Banner */}
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex justify-between max-w-md">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-4 w-12" />
          </div>
          <SkeletonBlock className="h-2.5 w-full max-w-md rounded-full" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SkeletonBlock className="h-8 w-20 rounded-lg" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Search & Year Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <SkeletonBlock className="h-10 w-full md:w-80 rounded-xl" />
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonBlock key={i} className="h-9 w-16 sm:w-20 rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Subject Cards by Year */}
      <div className="space-y-6">
        {[1, 2].map((year) => (
          <div key={year} className="space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-4 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((card) => (
                <div
                  key={card}
                  className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 shadow-2xs h-[136px] flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <SkeletonBlock className="h-4 w-4/5" />
                      <SkeletonBlock className="h-3 w-20" />
                    </div>
                    <SkeletonBlock className="h-6 w-16 rounded-md shrink-0" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                    <SkeletonBlock className="h-5 w-24 rounded-md" />
                    <SkeletonBlock className="h-7 w-7 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── CALENDAR SKELETON ──
 * Matches exactly Calendar.tsx with header card, month navigation bar and 7-column calendar grid
 */
export function CalendarSkeleton() {
  return (
    <div className="tabe-page p-4 lg:p-6 max-w-[1600px] mx-auto space-y-5 select-none">
      {/* Header Bento Card */}
      <div className="neo-bento-card p-5 lg:p-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <SkeletonBlock className="w-11 h-11 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-6 w-48 sm:w-64" />
            <SkeletonBlock className="h-4 w-40 sm:w-56" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-44 rounded-xl" />
          <SkeletonBlock className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Month Navigation & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <SkeletonBlock className="h-8 w-20 rounded-lg" />
          <SkeletonBlock className="h-6 w-36 ml-2" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* 7-Column Calendar Month Grid */}
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs">
        {/* Day Headers (Lun, Mar, Mié, Jue, Vie, Sáb, Dom) */}
        <div className="grid grid-cols-7 gap-2 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div key={d} className="flex justify-center">
              <SkeletonBlock className="h-4 w-10" />
            </div>
          ))}
        </div>
        {/* 5 Rows of Day Cells */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 sm:h-28 rounded-xl border border-zinc-100 dark:border-zinc-800/80 p-2 flex flex-col justify-between"
            >
              <div className="flex justify-between">
                <SkeletonBlock className="h-4 w-5 rounded-md" />
                {idx % 3 === 0 && <SkeletonBlock className="h-2 w-2 rounded-full" />}
              </div>
              {idx % 2 === 0 ? (
                <SkeletonBlock className="h-5 w-full rounded-md mt-auto" />
              ) : idx % 4 === 0 ? (
                <div className="space-y-1 mt-auto">
                  <SkeletonBlock className="h-4 w-full rounded-md" />
                  <SkeletonBlock className="h-4 w-3/4 rounded-md" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ── OFFICE HOURS (CONSULTAS) SKELETON ──
 * Matches exactly OfficeHours.tsx with header, filter bar and grid of professor consultation cards
 */
export function OfficeHoursSkeleton() {
  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-9 h-9 rounded-lg shrink-0" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-6 w-48 sm:w-60" />
            <SkeletonBlock className="h-4 w-36 sm:w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-32 rounded-xl" />
          <SkeletonBlock className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
        <SkeletonBlock className="h-9 w-full sm:w-64 rounded-xl" />
      </div>

      {/* Grid of Professor Cards (matching h-[168px] cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs h-[168px] flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <SkeletonBlock className="h-4 w-32 sm:w-40" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              </div>
              <SkeletonBlock className="h-6 w-16 rounded-md shrink-0" />
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="h-4 w-20" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <SkeletonBlock className="h-3 w-24" />
              <div className="flex gap-1">
                <SkeletonBlock className="h-7 w-7 rounded-lg" />
                <SkeletonBlock className="h-7 w-7 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── FLASHCARDS DECK GRID SKELETON ──
 * Matches exactly Flashcards.tsx deck grid
 */
export function FlashcardsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 select-none">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs h-[185px] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
            <SkeletonBlock className="h-6 w-14 rounded-md shrink-0" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-4/5" />
            <SkeletonBlock className="h-3.5 w-1/2" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ── QUIZZES GRID SKELETON ──
 * Matches exactly Quizzes.tsx decks grid
 */
export function QuizzesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs h-[195px] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-11 h-11 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
            </div>
            <SkeletonBlock className="h-6 w-16 rounded-md shrink-0" />
          </div>
          <div className="space-y-2 py-2">
            <SkeletonBlock className="h-3.5 w-full" />
            <SkeletonBlock className="h-3.5 w-3/4" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ── EXAMS SKELETON ──
 * Matches exactly Exams.tsx list of upcoming evaluation events
 */
export function ExamsSkeleton() {
  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-7 w-48 sm:w-64" />
          <SkeletonBlock className="h-4 w-52 sm:w-72" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
        </div>
        <SkeletonBlock className="h-9 w-48 rounded-lg hidden sm:block" />
      </div>

      {/* Exam Cards List */}
      <div className="space-y-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 shadow-2xs h-[88px] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 min-w-0">
              <SkeletonBlock className="w-14 h-14 rounded-xl shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <SkeletonBlock className="h-4 w-44 sm:w-60" />
                <SkeletonBlock className="h-3 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <SkeletonBlock className="h-6 w-16 rounded-md" />
              <SkeletonBlock className="h-7 w-20 rounded-lg hidden sm:block" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── ROUTINES SKELETON ──
 * Matches exactly Routines.tsx weekly grid view
 */
export function RoutinesSkeleton() {
  return (
    <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden select-none">
      <div className="overflow-x-auto">
        <div className="min-w-[760px] grid grid-cols-[64px_repeat(7,1fr)]">
          {/* Corner Header */}
          <div className="h-12 border-b border-r border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-center">
            <SkeletonBlock className="w-5 h-5 rounded-md" />
          </div>
          {/* 7 Days of the Week Headers */}
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="h-12 border-b border-r border-zinc-200/80 dark:border-zinc-800 p-2 flex flex-col items-center justify-center space-y-1"
            >
              <SkeletonBlock className="h-3 w-8" />
              <SkeletonBlock className="h-4 w-6 rounded-md" />
            </div>
          ))}
          {/* Hour Rows */}
          {[8, 10, 12, 14, 16, 18, 20].map((hour) => (
            <React.Fragment key={hour}>
              <div className="h-16 border-b border-r border-zinc-100 dark:border-zinc-800/60 p-1 flex items-center justify-center">
                <SkeletonBlock className="h-3 w-8" />
              </div>
              {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                <div
                  key={col}
                  className="h-16 border-b border-r border-zinc-100 dark:border-zinc-800/60 p-1.5"
                >
                  {(hour + col) % 4 === 0 && (
                    <SkeletonBlock className="h-full w-full rounded-lg" />
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ── FRIENDS SKELETON ──
 * Matches exactly Friends.tsx with header, tabs and friend cards
 */
export function FriendsSkeleton() {
  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-6 w-44" />
          <SkeletonBlock className="h-4 w-60" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-32 rounded-xl" />
          <SkeletonBlock className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-9 w-24 rounded-lg" />
        <SkeletonBlock className="h-9 w-28 rounded-lg" />
        <SkeletonBlock className="h-9 w-28 rounded-lg" />
      </div>

      {/* Grid of Friends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs h-[140px] flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-12 h-12 rounded-full shrink-0" />
              <div className="space-y-1.5 min-w-0 flex-1">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── NOTION / APUNTES GALLERY SKELETON ──
 * Replicates the Notion grid of notes with the exact height (300px),
 * cover area (160px), icon, title and badges.
 */
export function NotionGallerySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 select-none animate-in fade-in duration-200">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="flex flex-col bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden h-[300px] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        >
          {/* Cover Area */}
          <div className="h-40 w-full bg-zinc-100 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800/80 animate-pulse flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-200/60 dark:bg-zinc-700/40" />
          </div>
          {/* Body Info Area */}
          <div className="p-4 flex flex-col flex-1 justify-between bg-transparent">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-9 h-9 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <SkeletonBlock className="h-4 w-4/5 rounded" />
                <SkeletonBlock className="h-3 w-1/2 rounded" />
              </div>
            </div>
            {/* Badges footer */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <SkeletonBlock className="h-4 w-16 rounded" />
              <SkeletonBlock className="h-4 w-12 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ── NOTION EDITOR SKELETON ──
 * Replaces the big spinner in Notion.tsx when opening a document.
 * Matches the cover, floating icon, title, properties and body paragraphs.
 */
export function NotionEditorSkeleton() {
  return (
    <div className="w-full flex-1 overflow-y-auto select-none animate-in fade-in duration-200">
      {/* Cover Skeleton */}
      <div className="w-full h-44 sm:h-52 bg-zinc-100 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800/80 animate-pulse" />
      <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-8 space-y-6">
        {/* Floating Icon */}
        <div className="-mt-14 sm:-mt-16 mb-4">
          <SkeletonBlock className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white dark:border-[#1e1e1e] shadow-xs" />
        </div>
        {/* Title */}
        <SkeletonBlock className="h-10 w-2/3 rounded-xl mb-4" />
        {/* Properties bar (Subject, Timer, Actions) */}
        <div className="flex items-center gap-3 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <SkeletonBlock className="h-7 w-28 rounded-lg" />
          <SkeletonBlock className="h-7 w-20 rounded-lg" />
          <SkeletonBlock className="h-7 w-24 rounded-lg" />
        </div>
        {/* Paragraph 1 */}
        <div className="space-y-2.5 pt-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-11/12" />
          <SkeletonBlock className="h-4 w-4/5" />
        </div>
        {/* Heading 2 */}
        <SkeletonBlock className="h-6 w-1/3 rounded-lg pt-4" />
        {/* Paragraph 2 / Bullet items */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBlock className="w-4 h-4 rounded-md shrink-0" />
              <SkeletonBlock className="h-4 w-3/4" />
            </div>
          ))}
        </div>
        {/* Callout block */}
        <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 space-y-2 border border-zinc-200/60 dark:border-zinc-800/60">
          <SkeletonBlock className="h-3.5 w-1/2" />
          <SkeletonBlock className="h-3.5 w-2/3" />
        </div>
      </div>
    </div>
  );
}

/**
 * ── POMODORO SKELETON ──
 * Matches exactly Pomodoro.tsx with timer card, mode buttons, circular timer and session widget
 */
export function PomodoroSkeleton() {
  return (
    <div className="tabe-page p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 min-h-screen select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-6 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3.5">
          <SkeletonBlock className="w-11 h-11 rounded-lg shrink-0" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-6 w-48 sm:w-64" />
            <SkeletonBlock className="h-4 w-40 sm:w-60" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Timer Circle & Controls */}
        <div className="lg:col-span-8 bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-10 shadow-2xs flex flex-col items-center justify-center space-y-8 min-h-[480px]">
          {/* Mode Pills */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
            <SkeletonBlock className="h-8 w-28 rounded-lg" />
            <SkeletonBlock className="h-8 w-28 rounded-lg" />
          </div>

          {/* Big Pomodoro Circle */}
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border-8 border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center space-y-3 animate-pulse">
            <SkeletonBlock className="h-12 w-36 rounded-xl" />
            <SkeletonBlock className="h-4 w-20 rounded-md" />
          </div>

          {/* Action Buttons & Cycle Dots */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-12 w-32 rounded-xl" />
              <SkeletonBlock className="h-12 w-12 rounded-xl" />
            </div>
            {/* 4 Cycle dots */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((d) => (
                <SkeletonBlock key={d} className="w-3 h-3 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Subject & Tasks Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-10 w-full rounded-xl" />
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-8 w-full rounded-lg" />
            </div>
          </div>
          <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="h-12 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ── ACHIEVEMENTS (LOGROS) SKELETON ──
 * Exact 1:1 match of Achievements.tsx:
 * 1. Header Bento with Level Badge, Title and Actions (Ver mi rango, XP pill)
 * 2. Bento Grid: Progreso Global (8 cols) with percentage & bar, and Desbloqueados (4 cols) with 3 stat rows
 * 3. 4 Category Bento Cards (Estudio, Pomodoro, Flashcards, Racha) with percentage, count and progress
 * 4. Search bar & sort toolbar
 * 5. Grid of Achievement cards (with circular medal icon, title, description & progress bar)
 */
export function AchievementsSkeleton() {
  return (
    <div className="tabe-page p-4 lg:p-7 max-w-[1500px] mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* 1. Header Bento */}
      <div className="neo-bento-card p-6 lg:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5 bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs">
        <div>
          <SkeletonBlock className="h-6 w-36 rounded-full mb-2" />
          <SkeletonBlock className="h-8 w-60 sm:w-80 mb-1.5" />
          <SkeletonBlock className="h-4 w-72 sm:w-[460px]" />
        </div>
        <div className="flex items-center gap-2.5">
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* 2. Bento Grid: Progreso Global (8 cols) y Desbloqueados (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Progreso Global (8 cols) */}
        <div className="lg:col-span-8 neo-bento-card p-6 flex flex-col justify-between bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs min-h-[190px]">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-3.5 w-60" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-8 w-16" />
                <SkeletonBlock className="h-3.5 w-20" />
              </div>
            </div>
            <SkeletonBlock className="h-3 w-full rounded-full" />
          </div>
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <SkeletonBlock className="h-4 w-64" />
            <SkeletonBlock className="h-4 w-36" />
          </div>
        </div>

        {/* Desbloqueados (4 cols) */}
        <div className="lg:col-span-4 neo-bento-card p-6 flex flex-col justify-between bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs min-h-[190px]">
          <div>
            <SkeletonBlock className="h-4 w-28 mb-1" />
            <SkeletonBlock className="h-3 w-48 mb-4" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-3.5 w-32" />
                <SkeletonBlock className="h-3.5 w-8" />
              </div>
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-3.5 w-28" />
                <SkeletonBlock className="h-3.5 w-8" />
              </div>
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-3.5 w-40" />
                <SkeletonBlock className="h-3.5 w-16" />
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <SkeletonBlock className="h-4 w-36" />
          </div>
        </div>
      </div>

      {/* 3. Tarjetas Bento de las 4 Categorías (Estudio, Pomodoro, Flashcards, Racha) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] shadow-2xs space-y-2.5 h-[110px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-10 rounded-full" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <SkeletonBlock className="h-7 w-8" />
              <SkeletonBlock className="h-3.5 w-10" />
            </div>
            <SkeletonBlock className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* 4. Barra de Búsqueda y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <SkeletonBlock className="h-10 w-full md:w-80 rounded-xl" />
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* 5. Cuadrícula de Tarjetas de Logros (4 columnas idénticas a AchievementCard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="neo-bento-card p-5 flex flex-col justify-between bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xs min-h-[200px] space-y-3.5"
          >
            <div>
              {/* Header de la tarjeta con medalla e info superior */}
              <div className="flex items-start justify-between gap-2 mb-3.5">
                <SkeletonBlock className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex items-center gap-1.5">
                  <SkeletonBlock className="h-5 w-16 rounded-md" />
                  <SkeletonBlock className="h-5 w-14 rounded-md" />
                  <SkeletonBlock className="h-5 w-5 rounded-md" />
                </div>
              </div>
              {/* Textos: título y 2 líneas de descripción */}
              <div className="space-y-1.5">
                <SkeletonBlock className="h-4.5 w-3/4 rounded" />
                <SkeletonBlock className="h-3 w-full rounded" />
                <SkeletonBlock className="h-3 w-2/3 rounded" />
              </div>
            </div>

            {/* Footer de la tarjeta */}
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="h-3.5 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── FOREST (BOSQUE) SKELETON ──
 * Exact 1:1 match of Forest.tsx & ForestIsland.tsx:
 * 1. Hero Banner with Sprout/Tree badge, Title, Description and "Plantar Semilla" button
 * 2. 4 Navigation Tabs: "El Bosque (5 Islas)", "Árbol Activo", "Vivero de Especies", "Estadísticas"
 * 3. Selector de 5 Islas: Header with 5 Ecosistemas badge, and 5 island cards (Clásica, Pizza, Gaming, Estudio, Cósmica)
 * 4. Filters bar: Time Range (Hoy, Semana, Mes, Año, Todo), stats pills (Árboles, Tiempo, Calaveras) and Difficulty pills
 * 5. 2.5D Isometric floating island stage container
 */
export function ForestSkeleton() {
  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 select-none animate-in fade-in duration-200">
      {/* 1. Header Hero Banner */}
      <div className="bg-white dark:bg-[#212121] rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <SkeletonBlock className="w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-7 w-56 sm:w-72" />
            <SkeletonBlock className="h-4 w-72 sm:w-[480px]" />
          </div>
        </div>
        <SkeletonBlock className="h-10 w-36 rounded-xl" />
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl overflow-x-auto">
        <SkeletonBlock className="h-9 flex-1 min-w-[140px] rounded-lg" />
        <SkeletonBlock className="h-9 flex-1 min-w-[120px] rounded-lg" />
        <SkeletonBlock className="h-9 flex-1 min-w-[130px] rounded-lg" />
        <SkeletonBlock className="h-9 flex-1 min-w-[140px] rounded-lg" />
      </div>

      {/* 3. Selector de 5 Islas de Concentración */}
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-5 w-44" />
            </div>
          </div>
          <SkeletonBlock className="h-7 w-40 rounded-full" />
        </div>

        {/* Las 5 Tarjetas de Islas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-2 h-[84px] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full">
                <SkeletonBlock className="w-8 h-8 rounded-lg" />
                <SkeletonBlock className="h-4 w-6 rounded-md" />
              </div>
              <SkeletonBlock className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Top Bar with Time Filters and Badges */}
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl w-full md:w-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonBlock key={i} className="h-7 w-16 rounded-lg" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-7 w-20 rounded-md" />
            <SkeletonBlock className="h-7 w-24 rounded-md" />
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <SkeletonBlock className="h-3 w-16" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonBlock key={i} className="h-6 w-14 rounded-md" />
          ))}
        </div>
      </div>

      {/* 5. Escenario 2.5D / Isométrico de la Isla Flotante */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs min-h-[460px] p-6 lg:p-10 flex flex-col justify-between bg-zinc-100/70 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between w-full">
          <SkeletonBlock className="h-8 w-48 rounded-xl" />
          <SkeletonBlock className="h-8 w-36 rounded-xl" />
        </div>
        {/* Silueta central de la plataforma isométrica */}
        <div className="w-full max-w-lg mx-auto h-48 sm:h-60 rounded-[100%] bg-zinc-200/60 dark:bg-zinc-800/50 border border-zinc-300/40 dark:border-zinc-700/40 flex items-center justify-center gap-6 animate-pulse my-auto">
          <div className="w-12 h-20 rounded-t-xl bg-zinc-300/50 dark:bg-zinc-700/40" />
          <div className="w-14 h-28 rounded-t-xl bg-zinc-400/50 dark:bg-zinc-600/40 -mt-6" />
          <div className="w-12 h-16 rounded-t-xl bg-zinc-300/50 dark:bg-zinc-700/40" />
        </div>
      </div>
    </div>
  );
}

/**
 * ── CORRELATIVITY MAP SKELETON ──
 * Matches exactly CorrelativityMap.tsx fullscreen Cytoscape graph canvas
 */
export function CorrelativityMapSkeleton() {
  return (
    <div className="h-screen w-full bg-[#FAFAFA] dark:bg-[#171717] relative overflow-hidden select-none animate-in fade-in duration-200">
      {/* Floating Top Header Bar */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-32 rounded-xl shadow-xs" />
          <SkeletonBlock className="h-9 w-48 rounded-xl shadow-xs" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-xl shadow-xs" />
          <SkeletonBlock className="h-9 w-20 rounded-xl shadow-xs" />
        </div>
      </div>

      {/* Graph Column Simulation (Years 1 to 5 with interconnected subject nodes) */}
      <div className="h-full w-full flex items-center justify-around px-8 pt-16">
        {[1, 2, 3, 4, 5].map((year) => (
          <div key={year} className="flex flex-col items-center gap-6 h-4/5 justify-center">
            <SkeletonBlock className="h-5 w-16 rounded-md mb-2" />
            {[1, 2, 3, 4].map((node) => (
              <div
                key={node}
                className="w-40 sm:w-48 h-16 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] p-3 shadow-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <SkeletonBlock className="h-3 w-14" />
                  <SkeletonBlock className="h-4 w-10 rounded-full" />
                </div>
                <SkeletonBlock className="h-4 w-4/5" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── AI ASSISTANT (CHAT) SKELETON ──
 * Matches exactly AIAssistant.tsx with sidebar, message bubbles and floating prompt bar
 */
export function AIAssistantSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background select-none animate-in fade-in duration-200">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-zinc-200/80 dark:border-zinc-800/80 p-4 space-y-4 hidden md:flex flex-col bg-zinc-50/50 dark:bg-zinc-900/40">
        <SkeletonBlock className="h-10 w-full rounded-xl" />
        <div className="space-y-2 flex-1 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Chat Header */}
        <div className="h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 px-6 flex items-center justify-between bg-white dark:bg-[#212121]">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-8 h-8 rounded-full" />
            <SkeletonBlock className="h-4 w-36" />
          </div>
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>

        {/* Message Bubbles Thread */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-3xl mx-auto w-full">
          {/* Assistant Welcome */}
          <div className="flex gap-3">
            <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-2 max-w-lg bg-zinc-100 dark:bg-zinc-800/80 p-4 rounded-2xl">
              <SkeletonBlock className="h-4 w-64" />
              <SkeletonBlock className="h-4 w-48" />
            </div>
          </div>
          {/* User Query */}
          <div className="flex justify-end">
            <div className="bg-zinc-900 dark:bg-zinc-100 text-white p-3.5 rounded-2xl max-w-sm w-48">
              <SkeletonBlock className="h-4 w-36 bg-zinc-700 dark:bg-zinc-300" />
            </div>
          </div>
          {/* Assistant Response with code block */}
          <div className="flex gap-3">
            <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-3 flex-1 bg-zinc-100 dark:bg-zinc-800/80 p-4 rounded-2xl">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-5/6" />
              <SkeletonBlock className="h-24 w-full rounded-xl bg-zinc-200/60 dark:bg-zinc-700/60" />
            </div>
          </div>
        </div>

        {/* Bottom Floating Prompt Bar */}
        <div className="p-4 max-w-3xl mx-auto w-full">
          <SkeletonBlock className="h-14 w-full rounded-2xl shadow-xs" />
        </div>
      </div>
    </div>
  );
}

/**
 * ── LIBRARY (BIBLIOTECA) SKELETON ──
 * Matches exactly Library.tsx file cards grid
 */
export function LibrarySkeleton() {
  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="space-y-1.5">
          <SkeletonBlock className="h-6 w-52" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-32 rounded-xl" />
          <SkeletonBlock className="h-9 w-36 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div
            key={i}
            className="h-44 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] p-3 flex flex-col justify-between shadow-2xs"
          >
            <SkeletonBlock className="h-24 w-full rounded-lg" />
            <div className="space-y-1 pt-1">
              <SkeletonBlock className="h-3.5 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── MARKETPLACE (COMUNIDAD) SKELETON ──
 * Matches exactly Marketplace.tsx community decks & quizzes
 */
export function MarketplaceSkeleton() {
  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-2xl shadow-xs space-y-3">
        <SkeletonBlock className="h-7 w-60" />
        <SkeletonBlock className="h-4 w-80" />
        <div className="flex gap-2 pt-2">
          <SkeletonBlock className="h-9 w-36 rounded-lg" />
          <SkeletonBlock className="h-9 w-36 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[185px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] p-5 flex flex-col justify-between shadow-2xs"
          >
            <div className="flex justify-between items-start">
              <SkeletonBlock className="w-10 h-10 rounded-xl" />
              <SkeletonBlock className="h-5 w-16 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <SkeletonBlock className="h-4 w-4/5" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ── GENERIC RESPONSIVE SKELETON (LAST RESORT ONLY) ──
 */
export function GenericPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-64" />
        </div>
        <SkeletonBlock className="h-9 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 space-y-3 shadow-2xs">
            <SkeletonBlock className="w-10 h-10 rounded-xl" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
