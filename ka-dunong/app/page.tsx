"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  MessageSquare, Upload, Target, TrendingUp, BarChart2,
  Shield, ChevronRight, Menu, X, CheckCircle, Globe,
} from "lucide-react";

function KaDunongBookIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 79.511719 69.09375" fill="none">
      <path
        fillRule="evenodd"
        d="M 39.757812 69.09375 C 39.191406 69.09375 38.65625 68.835938 38.300781 68.394531 C 34.097656 63.136719 27.101562 58.269531 4.570312 58.269531 C 1.964844 58.269531 0 56.164062 0 53.371094 L 0 4.980469 C 0 2.457031 2.046875 0.410156 4.558594 0.410156 C 23.90625 0.496094 35.050781 4.519531 39.757812 13.320312 C 44.460938 4.519531 55.601562 0.496094 74.933594 0.410156 C 77.464844 0.410156 79.511719 2.457031 79.511719 4.96875 L 79.511719 53.699219 C 79.511719 56.21875 77.460938 58.269531 74.941406 58.269531 C 52.414062 58.269531 45.417969 63.132812 41.210938 68.394531 C 40.859375 68.835938 40.324219 69.09375 39.757812 69.09375 Z M 4.5625 4.136719 C 4.101562 4.136719 3.726562 4.511719 3.726562 4.96875 L 3.726562 53.371094 C 3.726562 53.644531 3.789062 54.542969 4.570312 54.542969 C 22.671875 54.542969 33.117188 57.425781 39.757812 64.398438 C 46.398438 57.425781 56.84375 54.542969 74.941406 54.542969 C 75.40625 54.542969 75.785156 54.164062 75.785156 53.699219 L 75.785156 4.980469 C 75.785156 4.507812 75.410156 4.136719 74.953125 4.136719 C 54.4375 4.226562 44.136719 8.804688 41.5625 18.96875 C 41.351562 19.796875 40.609375 20.375 39.757812 20.375 C 38.902344 20.375 38.160156 19.796875 37.949219 18.96875 C 35.375 8.804688 25.078125 4.226562 4.5625 4.136719 Z"
        fill={color}
      />
      <path
        fillRule="evenodd"
        d="M 39.757812 69.09375 C 38.726562 69.09375 37.894531 68.261719 37.894531 67.230469 L 37.894531 30.425781 C 37.894531 29.394531 38.726562 28.5625 39.757812 28.5625 C 40.785156 28.5625 41.621094 29.394531 41.621094 30.425781 L 41.621094 67.230469 C 41.621094 68.261719 40.785156 69.09375 39.757812 69.09375 Z"
        fill={color}
      />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <MessageSquare size={22} />,
    title: "Socratic Tutoring",
    desc: "Hindi ibinibigay ang sagot. Nagtatanong muna, nagbibigay ng hints, at tinutulungan kang pag-isipan — the way a real tutor would.",
  },
  {
    icon: <Upload size={22} />,
    title: "Upload Your Module",
    desc: "I-upload ang DepEd module, printed handout, o PDF. Ka-Dunong reads it and tutors you on that exact content — not a generic version.",
  },
  {
    icon: <Target size={22} />,
    title: "Practice on Demand",
    desc: "Humingi ng quiz, flashcard set, o worked example anumang oras. Generated from your materials — hindi mula sa generic question bank.",
  },
  {
    icon: <TrendingUp size={22} />,
    title: "Adapts to Your Level",
    desc: "Nagpapaliwanag nang simple kapag bago ka pa lang. Pumupunta ng mas malalim habang lumalaki ang pag-unawa mo.",
  },
  {
    icon: <BarChart2 size={22} />,
    title: "Tracks Your Progress",
    desc: "Sinusubaybayan kung ano na ang natutunan mo, saan ka nag-stuck, at kung ano ang kailangang i-review bago mag-exam.",
  },
  {
    icon: <Shield size={22} />,
    title: "Open Source & Private",
    desc: "Libre. Open source. Lahat ng data mo — sessions, uploads, progress — naka-save sa device mo. Hindi ibinabahagi.",
  },
];

const LANGUAGE_MODES = [
  {
    mode: "Taglish",
    isDefault: true,
    example: "\"So ang nangyari dito sa Battle of Mactan — what do you think ang naging dahilan kung bakit natalo si Magellan?\"",
  },
  {
    mode: "Full Filipino",
    isDefault: false,
    example: "\"Bakit mo sa tingin ay natalo si Magellan sa Labanan ng Mactan? Ano ang mga salik na nag-ambag dito?\"",
  },
  {
    mode: "Full English",
    isDefault: false,
    example: "\"Why do you think Magellan was defeated at the Battle of Mactan? What factors contributed to that outcome?\"",
  },
];

const SUBJECTS = [
  { subject: "Filipino", icon: "📖", sub: "Wika at Panitikan" },
  { subject: "English", icon: "📚", sub: "Language Arts" },
  { subject: "Mathematics", icon: "📐", sub: "Grade 1–12" },
  { subject: "Science", icon: "🔬", sub: "Biology, Chem, Physics" },
  { subject: "Araling Panlipunan", icon: "🗺️", sub: "Kasaysayan, Ekonomiks" },
  { subject: "ESP", icon: "💡", sub: "Edukasyon sa Pagpapakatao" },
  { subject: "MAPEH", icon: "🎨", sub: "Music, Arts, PE, Health" },
  { subject: "TLE / TVL", icon: "🔧", sub: "Technical-Vocational" },
];

const PRINCIPLES = [
  {
    num: "01",
    title: "Understanding over answers",
    desc: "Every feature is designed to help you actually learn the material, not just get through an assignment.",
  },
  {
    num: "02",
    title: "Taglish is not a bug",
    desc: "Most Filipino students think in Taglish. Ka-Dunong embraces this as the natural default.",
  },
  {
    num: "03",
    title: "Works where students are",
    desc: "Designed for mid-range devices and spotty connections. Because that's the reality for most Filipino students.",
  },
  {
    num: "04",
    title: "Your data is yours",
    desc: "No school admin, no parent dashboard, no third-party data sharing. Just you and your study sessions.",
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#3d3535]">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#3d3535]/10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/bird-app.png" alt="Dunong mascot" width={32} height={32} className="object-contain" />
            <span className="font-bold text-lg text-[#3d3535]">
              Ka-Dunong<span className="text-[#c97e82]">.ai</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium">
            <a href="#features" className="text-[#3d3535]/60 hover:text-[#3d3535] transition-colors">Features</a>
            <a href="#curriculum" className="text-[#3d3535]/60 hover:text-[#3d3535] transition-colors">Curriculum</a>
            <a href="#about" className="text-[#3d3535]/60 hover:text-[#3d3535] transition-colors">About</a>
          </div>

          <Link
            href="/chat"
            className="hidden md:inline-flex items-center gap-1.5 bg-[#3d3535] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#c97e82] transition-colors"
          >
            Magsimula Na <ChevronRight size={15} />
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#3d3535] hover:bg-[#3d3535]/5 transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#3d3535]/10 px-4 py-4 space-y-3 bg-white">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-[#3d3535]/70 py-1">Features</a>
            <a href="#curriculum" onClick={() => setMobileMenuOpen(false)} className="block text-[#3d3535]/70 py-1">Curriculum</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-[#3d3535]/70 py-1">About</a>
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 bg-[#3d3535] text-white px-5 py-3 rounded-xl text-sm font-semibold mt-2"
            >
              Magsimula Na <ChevronRight size={15} />
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-24 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#c97e82]/10 text-[#c97e82] px-3 py-1.5 rounded-full text-sm font-medium mb-7">
              <span className="w-2 h-2 rounded-full bg-[#c97e82] inline-block" />
              DepEd K-12 · Grade 1–12 · Free & Open Source
            </div>

            <h1 className="text-4xl lg:text-[3.2rem] font-extrabold text-[#3d3535] leading-tight mb-5">
              Ang study companion<br className="hidden sm:block" /> na para sa iyo.
            </h1>

            <p className="text-lg text-[#3d3535]/65 leading-relaxed mb-8 max-w-lg">
              Ka-Dunong tutors you the Socratic way — hindi ibinibigay ang sagot, tinutulungan kang hanapin ito mismo. Sa Taglish, base sa DepEd curriculum.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 bg-[#3d3535] text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-[#c97e82] transition-colors text-base"
              >
                Magsimula Na <ChevronRight size={18} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center border border-[#3d3535]/20 text-[#3d3535] px-7 py-3.5 rounded-xl font-medium hover:bg-[#3d3535]/5 transition-colors text-base"
              >
                Alamin Kung Paano
              </a>
            </div>

            <div className="flex flex-wrap gap-5 text-sm text-[#3d3535]/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-[#c97e82]" /> Libre
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-[#c97e82]" /> Offline learning
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-[#c97e82]" /> Lahat ng DepEd subjects
              </span>
            </div>
          </div>

          {/* Right: Chat mockup + bird overlapping bottom-left */}
          <div className="relative flex flex-col items-center lg:items-end">
            {/* Chat preview */}
            <div className="bg-[#1a1212] rounded-2xl p-4 shadow-2xl w-full max-w-[390px] border border-[#c97e82]/20">
              {/* Chat header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#c97e82] flex items-center justify-center flex-shrink-0">
                  <KaDunongBookIcon size={14} color="white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-none">
                    Ka-Dunong<span className="text-[#e8b5b7]">.ai</span>
                  </p>
                  <p className="text-white/35 text-xs mt-0.5">Grade 8 · Science · Taglish</p>
                </div>
              </div>

              {/* Sample conversation */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-end">
                  <div className="bg-[#c97e82] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%] leading-relaxed">
                    Hindi ko gets ang gravity. Bakit tayo natatagalan sa lupa?
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-md bg-[#c97e82] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <KaDunongBookIcon size={10} color="white" />
                  </div>
                  <div className="bg-white/[0.06] border border-white/10 text-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] leading-relaxed">
                    Okay, gravity! Bago tayo mag-dive in — kung tatanggalin mo raw ang lupa sa ilalim mo ngayon, anong mangyayari sa iyo?
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-[#c97e82] text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                    ...mahuhulog?
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-md bg-[#c97e82] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <KaDunongBookIcon size={10} color="white" />
                  </div>
                  <div className="bg-white/[0.06] border border-white/10 text-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] leading-relaxed">
                    Tama! Pababa, di ba? So —{" "}
                    <span className="text-[#e8b5b7] font-medium">bakit pababa</span>{" "}
                    at hindi, sabihin nating… pakanan?
                  </div>
                </div>
              </div>

              {/* Input area */}
              <div className="mt-4 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                <span className="text-white/25 text-sm flex-1">Mag-type ng tanong...</span>
                <div className="w-6 h-6 rounded-md bg-[#c97e82] flex items-center justify-center flex-shrink-0">
                  <ChevronRight size={12} className="text-white" />
                </div>
              </div>
            </div>

            {/* Bird + speech bubble — bottom-left of chat, bubble overlaps chat bottom */}
            <div className="absolute bottom-10 left-[-20%] flex items-end gap-0 z-20 group cursor-default">
              <Image
                src="/bird-happy.png"
                alt="Dunong, the Ka-Dunong mascot"
                width={310}
                height={310}
                className="object-contain drop-shadow-md transition-transform duration-300 ease-out group-hover:-translate-y-5"
              />
              
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-[#fdf5f5] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center mb-14">
            <div className="flex items-center gap-4 justify-center mb-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#3d3535] text-center">
                Designed para matuto ka talaga.
              </h2>
              <Image
                src="/bird-curious.png"
                alt="Curious Dunong"
                width={72}
                height={72}
                className="object-contain flex-shrink-0 hover:-translate-y-3 transition-transform duration-300 ease-out"
              />
            </div>
            <p className="text-[#3d3535]/60 text-lg max-w-xl text-center">
              Hindi lang question-and-answer. Ka-Dunong builds real understanding — the kind that sticks when exam day comes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-[#3d3535]/8 hover:border-[#c97e82]/40 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#3d3535]/8 text-[#c97e82] flex items-center justify-center mb-4 group-hover:bg-[#c97e82] group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-[#3d3535] mb-2">{f.title}</h3>
                <p className="text-[#3d3535]/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Language Modes ── */}
      <section className="bg-[#3d3535] py-20 text-white relative overflow-hidden">
        {/* Bird peeking from left, lower half hidden */}
        <div className="absolute left-0 bottom-0 translate-y-1/2 z-10 pointer-events-none flex flex-col items-center">
          <Image
            src="/bird-sad.png"
            alt="Dunong peeking"
            width={260}
            height={260}
            className="object-contain drop-shadow-md pointer-events-auto hover:-translate-y-3 transition-transform duration-300 ease-out"
          />
          <p className="text-white/40 text-xs text-center max-w-[130px] leading-tight mt-1">
            Kapag stuck ka, nandito si Dunong
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end gap-6 mb-14">
            <div className="flex-1">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Taglish is not a bug.</h2>
              <p className="text-white/55 text-lg max-w-xl">
                Karamihan sa Filipino students ay nag-iisip sa Taglish. Tinatanggap ito ng Ka-Dunong bilang natural na paraan ng pag-aaral — hindi bug, default.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {LANGUAGE_MODES.map((lang) => (
              <div
                key={lang.mode}
                className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.09] transition-colors"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Globe size={15} className="text-[#e8b5b7]" />
                  <span className="text-[#e8b5b7] text-sm font-semibold">{lang.mode}</span>
                  {lang.isDefault && (
                    <span className="ml-auto text-xs bg-[#c97e82]/30 text-[#e8b5b7] px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-white/75 text-sm leading-relaxed italic">{lang.example}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-white/35 text-sm mt-8">
            You can switch modes at any time. The AI follows your lead.
          </p>
        </div>
      </section>

      {/* ── Curriculum ── */}
      <section id="curriculum" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#3d3535] mb-4">
              Lahat ng DepEd subjects.
            </h2>
            <p className="text-[#3d3535]/60 text-lg max-w-xl mx-auto">
              Ka-Dunong knows the learning competencies and subject matter across all K-12 learning areas — Grades 1 through 12.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SUBJECTS.map((s) => (
              <div
                key={s.subject}
                className="border border-[#3d3535]/10 rounded-xl p-4 hover:border-[#c97e82]/50 hover:bg-[#fdf5f5] transition-all text-center group"
              >
                <div className="text-2xl mb-2">{s.icon}</div>
                <h3 className="font-semibold text-[#3d3535] text-sm leading-tight">{s.subject}</h3>
                <p className="text-[#3d3535]/40 text-xs mt-1 leading-tight">{s.sub}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-[#3d3535]/40 text-sm mt-6">
            + Senior High Core and Applied subjects — Academic, TVL, Sports, and Arts & Design tracks
          </p>
        </div>
      </section>

      {/* ── About / Principles ── */}
      <section id="about" className="py-20 bg-[#fdf5f5] relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#3d3535] mb-5 leading-tight">
                Para sa Filipino students,<br className="hidden sm:block" /> hindi para sa kanila.
              </h2>
              <p className="text-[#3d3535]/60 text-lg leading-relaxed mb-6">
                Ka-Dunong is not a foreign product adapted for the Philippines. The curriculum, the language, and the way the AI talks are designed around the actual experience of studying here.
              </p>
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 text-[#c97e82] font-semibold hover:text-[#3d3535] transition-colors"
              >
                Subukan mo na <ChevronRight size={16} />
              </Link>
            </div>

            <div className="space-y-4">
              {PRINCIPLES.map((p) => (
                <div
                  key={p.num}
                  className="bg-white rounded-xl p-5 flex gap-4 items-start border border-[#3d3535]/8 hover:border-[#c97e82]/30 transition-colors"
                >
                  <span className="text-[#c97e82] font-bold text-sm w-7 flex-shrink-0 pt-0.5">{p.num}</span>
                  <div>
                    <h3 className="font-bold text-[#3d3535] mb-1">{p.title}</h3>
                    <p className="text-[#3d3535]/60 text-sm leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bird at bottom, lower half hidden by section transition */}
        <div className="absolute bottom-0 left-[8%] translate-y-1/2 pointer-events-none z-10">
          <Image
            src="/bird-curious.png"
            alt="Curious Dunong"
            width={480}
            height={480}
            className="object-contain drop-shadow-md pointer-events-auto hover:-translate-y-3 transition-transform duration-300 ease-out"
          />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[#c97e82] pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          {/* Large bird with headline text layered over its body */}
          <div className="relative inline-flex flex-col items-center justify-center mb-6">
            <Image
              src="/bird-happy.png"
              alt="Dunong cheering"
              width={360}
              height={360}
              className="object-contain drop-shadow-xl hover:-translate-y-3 transition-transform duration-300 ease-out"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight px-6 drop-shadow-md">
                Handa ka na bang mag-aral?
              </h2>
            </div>
          </div>

          <p className="text-white/75 text-lg mb-9 max-w-md mx-auto">
            Walang account. Walang bayad. Just you, your lessons, and Ka-Dunong.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 bg-white text-[#c97e82] px-9 py-4 rounded-xl font-bold text-lg hover:bg-[#3d3535] hover:text-white transition-colors"
          >
            Magsimula Na <ChevronRight size={20} />
          </Link>
          <p className="text-white/50 text-sm mt-5">Libre. Open source. Always.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#3d3535] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src="/bird-app.png"
                  alt="Dunong"
                  width={40}
                  height={40}
                  className="object-contain hover:-translate-y-3 transition-transform duration-300 ease-out"
                />
                <span className="font-bold text-white text-lg">
                  Ka-Dunong<span className="text-[#e8b5b7]">.ai</span>
                </span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">
                An open source AI study companion for Filipino K-12 students. Built for the DepEd curriculum, in Taglish.
              </p>
            </div>

            <div className="flex gap-14 text-sm">
              <div>
                <h4 className="text-white/50 font-semibold mb-3 uppercase text-xs tracking-wider">Product</h4>
                <div className="space-y-2.5">
                  <a href="#features" className="block text-white/40 hover:text-white transition-colors">Features</a>
                  <a href="#curriculum" className="block text-white/40 hover:text-white transition-colors">Curriculum</a>
                  <Link href="/chat" className="block text-white/40 hover:text-white transition-colors">Open App</Link>
                </div>
              </div>
              <div>
                <h4 className="text-white/50 font-semibold mb-3 uppercase text-xs tracking-wider">Project</h4>
                <div className="space-y-2.5">
                  <span className="block text-white/40">Open Source</span>
                  <span className="block text-white/40">Free Forever</span>
                  <span className="block text-white/40">DepEd Aligned</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-10 pt-8 text-center text-white/25 text-sm">
            Ka-Dunong.ai — Built for Filipino students · Dunong the bird says hi
          </div>
        </div>
      </footer>
    </div>
  );
}
