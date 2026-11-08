import React from 'react';
import { Check, X, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PasswordRule {
  id: string;
  label: string;
  valid: boolean;
  required: boolean;
}

export function evaluatePassword(password: string) {
  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: 'Minimum 8 caractères',
      valid: password.length >= 8,
      required: true,
    },
    {
      id: 'uppercase',
      label: 'Au moins une lettre majuscule (A-Z)',
      valid: /[A-Z]/.test(password),
      required: true,
    },
    {
      id: 'lowercase',
      label: 'Au moins une lettre minuscule (a-z)',
      valid: /[a-z]/.test(password),
      required: true,
    },
    {
      id: 'number',
      label: 'Au moins un chiffre (0-9)',
      valid: /[0-9]/.test(password),
      required: true,
    },
    {
      id: 'special',
      label: 'Au moins un caractère spécial (@, #, $, !, %, etc.)',
      valid: /[^A-Za-z0-9]/.test(password),
      required: false,
    },
  ];

  const requiredPassed = rules.filter(r => r.required && r.valid).length;
  const totalPassed = rules.filter(r => r.valid).length;
  const isStrictValid = rules.filter(r => r.required).every(r => r.valid);

  let strengthLabel = 'Très faible';
  let strengthColor = 'bg-rose-500';
  let textColor = 'text-rose-400';
  let percentage = 15;

  if (totalPassed === 1) {
    strengthLabel = 'Très faible';
    strengthColor = 'bg-rose-500';
    textColor = 'text-rose-400';
    percentage = 20;
  } else if (totalPassed === 2) {
    strengthLabel = 'Faible';
    strengthColor = 'bg-orange-500';
    textColor = 'text-orange-400';
    percentage = 40;
  } else if (totalPassed === 3) {
    strengthLabel = 'Moyen';
    strengthColor = 'bg-amber-500';
    textColor = 'text-amber-400';
    percentage = 65;
  } else if (totalPassed === 4) {
    strengthLabel = 'Bon (Sécurisé)';
    strengthColor = 'bg-emerald-500';
    textColor = 'text-emerald-400';
    percentage = 85;
  } else if (totalPassed >= 5) {
    strengthLabel = 'Excellent (Très fort)';
    strengthColor = 'bg-emerald-400';
    textColor = 'text-emerald-300';
    percentage = 100;
  }

  return {
    rules,
    requiredPassed,
    totalPassed,
    isStrictValid,
    strengthLabel,
    strengthColor,
    textColor,
    percentage,
  };
}

interface PasswordStrengthMeterProps {
  password: string;
  showRules?: boolean;
  className?: string;
}

export default function PasswordStrengthMeter({
  password,
  showRules = true,
  className,
}: PasswordStrengthMeterProps) {
  if (!password) {
    return null;
  }

  const { rules, isStrictValid, strengthLabel, strengthColor, textColor, percentage } = evaluatePassword(password);

  return (
    <div className={cn("mt-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5", className)}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-400 flex items-center gap-1.5">
            {isStrictValid ? (
              <ShieldCheck size={14} className="text-emerald-400" />
            ) : (
              <ShieldAlert size={14} className="text-amber-400" />
            )}
            Niveau de sécurité :
          </span>
          <span className={cn("font-black tracking-wide", textColor)}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300 rounded-full", strengthColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Rules Checklist */}
      {showRules && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-colors",
                rule.valid ? "text-emerald-400 font-semibold" : "text-slate-500 font-normal"
              )}
            >
              {rule.valid ? (
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check size={10} strokeWidth={3} />
                </div>
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                  <div className="w-1 h-1 rounded-full bg-slate-500" />
                </div>
              )}
              <span>{rule.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
