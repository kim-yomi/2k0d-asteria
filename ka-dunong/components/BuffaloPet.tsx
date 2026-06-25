"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { type EvolutionStatus } from "@/lib/progress";

interface BuffaloPetProps {
  evolution: EvolutionStatus;
}

export default function BuffaloPet({ evolution }: BuffaloPetProps) {
  const { stage, evolutionPercent, components } = evolution;
  const [justEvolved, setJustEvolved] = useState(false);
  const [prevStage, setPrevStage] = useState(stage);

  // Detect evolution transition and trigger animation
  useEffect(() => {
    if (prevStage === "base" && stage === "evolved") {
      setJustEvolved(true);
      setTimeout(() => setJustEvolved(false), 2000);
    }
    setPrevStage(stage);
  }, [stage, prevStage]);

  const sprite =
    stage === "evolved" ? "/buffalo-evolved.png" : "/buffalo-base.png";

  const stageName = stage === "evolved" ? "Evolved" : "Base";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
      {/* Pet display */}
      <div className="flex items-center gap-5">
        <div className={`relative flex-shrink-0 ${justEvolved ? "animate-bounce" : ""}`}>
          {/* Glow behind buffalo when evolved */}
          {stage === "evolved" && (
            <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-xl scale-150" />
          )}
          <Image
            src={sprite}
            alt={`Buffalo — ${stageName}`}
            width={80}
            height={80}
            className="object-contain relative z-10 drop-shadow-lg"
          />
          {justEvolved && (
            <div className="absolute -top-2 -right-2 text-lg animate-ping">✨</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-white">Bulalo</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              stage === "evolved"
                ? "bg-yellow-400/20 text-yellow-400"
                : "bg-white/10 text-white/50"
            }`}>
              {stageName}
            </span>
          </div>
          <p className="text-white/40 text-xs mb-3">
            {stage === "evolved"
              ? "Na-evolve na si Bulalo! Patuloy mag-aral."
              : `${100 - evolutionPercent}% pa para mag-evolve si Bulalo.`}
          </p>

          {/* Overall evolution bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Evolution</span>
              <span className={stage === "evolved" ? "text-yellow-400" : "text-white/60"}>
                {evolutionPercent}%
              </span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  stage === "evolved"
                    ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                    : "bg-gradient-to-r from-[#3d9185] to-[#80bbb2]"
                }`}
                style={{ width: `${evolutionPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="space-y-2.5">
        <p className="text-xs text-white/30 uppercase tracking-wider">Paano mag-evolve</p>

        <div className="space-y-2">
          {/* Quiz */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/50">Quiz average (85% goal)</span>
              <span className={components.quiz >= 100 ? "text-green-400" : "text-white/40"}>
                {components.quiz >= 100 ? "✓ Done" : `${components.quiz}%`}
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  components.quiz >= 100 ? "bg-green-400" : "bg-[#c97e82]"
                }`}
                style={{ width: `${components.quiz}%` }}
              />
            </div>
          </div>

          {/* Sessions */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/50">Study sessions (10 goal)</span>
              <span className={components.sessions >= 100 ? "text-green-400" : "text-white/40"}>
                {components.sessions >= 100 ? "✓ Done" : `${components.sessions}%`}
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  components.sessions >= 100 ? "bg-green-400" : "bg-[#c97e82]"
                }`}
                style={{ width: `${components.sessions}%` }}
              />
            </div>
          </div>

          {/* Streak */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/50">Study streak (7 days goal)</span>
              <span className={components.streak >= 100 ? "text-green-400" : "text-white/40"}>
                {components.streak >= 100 ? "✓ Done" : `${components.streak}%`}
              </span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  components.streak >= 100 ? "bg-green-400" : "bg-[#c97e82]"
                }`}
                style={{ width: `${components.streak}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
