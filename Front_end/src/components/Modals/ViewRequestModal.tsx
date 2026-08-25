import React, { useState } from "react";
import { RegistrationRequest } from "../../types";
import { formatPhoneNumber, formatDateOnly } from "../../utils/formatters";

interface ViewRequestModalProps {
  request: RegistrationRequest | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const DEFAULT_CCCD_FRONT =
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80";
const DEFAULT_CCCD_BACK =
  "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80";

export const ViewRequestModal: React.FC<ViewRequestModalProps> = ({
  request,
  onClose,
  onApprove,
  onReject,
}) => {
  const [previewImg, setPreviewImg] = useState<{ title: string; url: string } | null>(null);

  if (!request) return null;

  const cccdFrontUrl = request.cccdFront || DEFAULT_CCCD_FRONT;
  const cccdBackUrl = request.cccdBack || DEFAULT_CCCD_BACK;

  const handleViewCV = () => {
    if (request.cvFile) {
      window.open(request.cvFile, "_blank", "noopener,noreferrer");
      return;
    }

    alert(`Đang mở tài liệu: ${request.cvFileName || "CV"}`);
  };

  const fallbackContent = [
    "HỒ SƠ ĐĂNG KÝ CỘNG TÁC VIÊN",
    "",
    `Họ và tên: ${request.name}`,
    `Số điện thoại: ${request.phone}`,
    `Email: ${request.email}`,
    `Ngày sinh: ${request.dob || "Chưa cập nhật"}`,
    `Ngày đăng ký: ${formatDateOnly(request.submittedAt)}`,
  ].join("\n");
  const fallbackName = `${(request.cvFileName || `CV_${request.name}`)
    .replace(/\.[^.]+$/, "")
    .replace(/\s+/g, "_")}.txt`;
  const downloadHref =
    request.cvFile || `data:text/plain;charset=utf-8,${encodeURIComponent(fallbackContent)}`;
  const downloadName = request.cvFile ? request.cvFileName || "CV.pdf" : fallbackName;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#25262b] rounded-2xl border border-[#E2E8F0] dark:border-[#3b3d45] shadow-2xl w-full max-w-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#3b3d45] bg-[#F8FAFC] dark:bg-[#1f2023]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1b365d]/10 text-[#1b365d] dark:bg-[#1b365d]/30 dark:text-[#87a0cd] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
            <h3 className="text-base font-bold text-[#1b365d] dark:text-[#d6e3ff]">
              Chi tiết Hồ sơ Đăng ký CTV
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#74777f] hover:text-[#1b365d] dark:hover:text-white p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* User Profile Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1e1f23] border border-[#E2E8F0] dark:border-[#3b3d45]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1b365d] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                {request.initials || request.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#1b365d] dark:text-[#d6e3ff]">
                  {request.name}
                </h4>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1 text-xs text-[#74777f] dark:text-[#c4c6cf]">
              <p>
                Ngày đăng ký:{" "}
                <span className="font-semibold text-[#1b365d] dark:text-white">
                  {formatDateOnly(request.submittedAt)}
                </span>
              </p>
            </div>
          </div>

          {/* Section 1: Detailed Profile Info (2-column layout matching Account Detail) */}
          <div>
            <h5 className="text-xs font-bold text-[#1b365d] dark:text-[#d6e3ff] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">person</span>
              <span>Thông tin cá nhân & Tài khoản</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F8FAFC] dark:bg-[#1e1f23] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#3b3d45]">
              <div className="flex justify-between p-2 rounded bg-white dark:bg-[#25262b] border border-[#E2E8F0]/60 dark:border-[#3b3d45]">
                <span className="text-[#74777f] dark:text-[#c4c6cf]">Họ và tên:</span>
                <span className="font-semibold text-[#1b365d] dark:text-white">{request.name}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white dark:bg-[#25262b] border border-[#E2E8F0]/60 dark:border-[#3b3d45]">
                <span className="text-[#74777f] dark:text-[#c4c6cf]">Email:</span>
                <span
                  className="font-semibold text-[#1b365d] dark:text-white truncate max-w-[180px]"
                  title={request.email}
                >
                  {request.email}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white dark:bg-[#25262b] border border-[#E2E8F0]/60 dark:border-[#3b3d45]">
                <span className="text-[#74777f] dark:text-[#c4c6cf]">Số điện thoại:</span>
                <span className="font-semibold text-[#1b365d] dark:text-white">
                  {formatPhoneNumber(request.phone)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white dark:bg-[#25262b] border border-[#E2E8F0]/60 dark:border-[#3b3d45]">
                <span className="text-[#74777f] dark:text-[#c4c6cf]">Ngày sinh:</span>
                <span className="font-semibold text-[#1b365d] dark:text-white">
                  {request.dob || "14/05/1995"}
                </span>
              </div>
            </div>
          </div>

          {/* CCCD Section */}
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1e1f23] border border-[#E2E8F0] dark:border-[#3b3d45]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#1b365d] dark:text-[#d6e3ff] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span>Ảnh chụp CCCD (Mặt trước & Mặt sau)</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() =>
                  setPreviewImg({ title: `CCCD Mặt trước - ${request.name}`, url: cccdFrontUrl })
                }
                className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#25262b] overflow-hidden h-24 cursor-pointer shadow-2xs hover:border-blue-400 dark:hover:border-blue-500 transition-all"
              >
                <img
                  src={cccdFrontUrl}
                  alt="CCCD Mặt trước"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                  <span>Mặt trước</span>
                </div>
              </div>

              <div
                onClick={() =>
                  setPreviewImg({ title: `CCCD Mặt sau - ${request.name}`, url: cccdBackUrl })
                }
                className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#25262b] overflow-hidden h-24 cursor-pointer shadow-2xs hover:border-blue-400 dark:hover:border-blue-500 transition-all"
              >
                <img
                  src={cccdBackUrl}
                  alt="CCCD Mặt sau"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                  <span>Mặt sau</span>
                </div>
              </div>
            </div>
          </div>

          {/* CV Section */}
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1e1f23] border border-[#E2E8F0] dark:border-[#3b3d45]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#1b365d] dark:text-[#d6e3ff] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span>Hồ sơ ứng tuyển (CV)</span>
              </span>
            </div>

            {request.cvFileName || request.cvFile ? (
              <div className="p-2.5 bg-white dark:bg-[#25262b] border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      (request.cvFileName || "").toLowerCase().endsWith(".pdf")
                        ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                        : "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {(request.cvFileName || "").toLowerCase().endsWith(".pdf")
                        ? "picture_as_pdf"
                        : "description"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1a1b1e] dark:text-[#d6e3ff] truncate">
                      {request.cvFileName || "Ho_so_CV.pdf"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={handleViewCV}
                      aria-label="Xem file"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      Xem file
                    </span>
                  </div>

                  <div className="group relative">
                    <a
                      href={downloadHref}
                      download={downloadName}
                      aria-label="Tải về"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </a>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      Tải về
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-[#25262b] border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs text-slate-400">
                Chưa đính kèm file CV
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#3b3d45] bg-[#F8FAFC] dark:bg-[#1f2023] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              onReject(request.id);
              onClose();
            }}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/80 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            <span>Từ chối hồ sơ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onApprove(request.id);
              onClose();
            }}
            className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Phê duyệt</span>
          </button>
        </div>
      </div>

      {/* LIGHTBOX PREVIEW MODAL */}
      {previewImg && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1b365d] text-[20px]">badge</span>
                <h3 className="font-bold text-sm text-[#1b365d]">{previewImg.title}</h3>
              </div>
              <button
                onClick={() => setPreviewImg(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-[60vh]">
              <img
                src={previewImg.url}
                alt={previewImg.title}
                className="w-full h-auto object-contain max-h-[60vh]"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewImg(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
