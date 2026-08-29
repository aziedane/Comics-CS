import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, RefreshCw, Sparkles, X } from "lucide-react";

interface QuotaCountdownAlertProps {
  initialSeconds?: number;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoRetry?: boolean;
}

export const QuotaCountdownAlert: React.FC<QuotaCountdownAlertProps> = ({
  initialSeconds = 30,
  message,
  onRetry,
  onDismiss,
  autoRetry = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isAutoRetryEnabled, setIsAutoRetryEnabled] = useState<boolean>(autoRetry);

  useEffect(() => {
    setTimeLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (isAutoRetryEnabled && onRetry) {
        onRetry();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isAutoRetryEnabled, onRetry]);

  const displayMessage =
    message ||
    "Batas kuota Gemini API (Rate Limit) sementara tercapai pada tier gratis. Mohon tunggu sejenak hingga kuota otomatis pulih.";

  return (
    <div
      id="quota-countdown-alert"
      className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200 backdrop-blur-sm shadow-lg space-y-3 animate-in fade-in duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 mt-0.5 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-amber-100 text-sm md:text-base">
                Menunggu Pemulihan Kuota AI (Rate Limit Cooldown)
              </h4>
              {timeLeft > 0 && (
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 animate-pulse">
                  {timeLeft}s
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-amber-200/80 mt-1 leading-relaxed">
              {displayMessage}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            id="dismiss-quota-alert-btn"
            onClick={onDismiss}
            className="text-amber-400/60 hover:text-amber-200 p-1 transition-colors"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/20 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {timeLeft > 0 ? (
              <>
                Sisa waktu tunggu: <strong className="text-amber-300">{timeLeft} detik</strong>
              </>
            ) : (
              <span className="text-emerald-400 font-semibold">
                ✓ Kuota siap! Anda dapat mencoba generate kembali sekarang.
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onRetry && (
            <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 select-none">
              <input
                type="checkbox"
                checked={isAutoRetryEnabled}
                onChange={(e) => setIsAutoRetryEnabled(e.target.checked)}
                className="rounded border-amber-500/40 text-amber-500 focus:ring-amber-500 bg-neutral-900"
              />
              <span>Ulangi otomatis saat timer selesai</span>
            </label>
          )}

          {onRetry && (
            <button
              id="retry-quota-btn"
              onClick={onRetry}
              disabled={timeLeft > 0 && !isAutoRetryEnabled}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                timeLeft === 0
                  ? "bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-md shadow-amber-500/20 cursor-pointer"
                  : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${timeLeft > 0 ? "animate-spin" : ""}`} />
              <span>{timeLeft === 0 ? "Coba Lagi Sekarang" : "Paksa Coba Lagi"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
