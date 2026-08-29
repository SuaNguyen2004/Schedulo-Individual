import React, { useState, useRef } from "react";
import { UserAccount } from "../../types";
import { formatPhoneNumber } from "../../utils/formatters";

interface ProfileScreenProps {
  user: UserAccount;
  onOpenEditProfile: () => void;
  onOpenChangePassword: () => void;
  onUpdateAvatar?: (newAvatarUrl: string) => void;
  onUpdateCccdFront?: (url: string) => void;
  onUpdateCccdBack?: (url: string) => void;
  onUpdateCvFile?: (
    cvData: { cvFile: string; cvFileName: string; cvFileSize?: string } | null,
  ) => void;
  isAdminViewing?: boolean;
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onOpenEditProfile,
  onOpenChangePassword,
  onUpdateAvatar,
  onUpdateCccdFront,
  onUpdateCccdBack,
  onUpdateCvFile,
  isAdminViewing = false,
  onBack,
}) => {
  const isAdmin = user.role === "Admin";

  const [previewModal, setPreviewModal] = useState<{
    title: string;
    url: string;
    side: "avatar" | "front" | "back";
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cccdFrontInputRef = useRef<HTMLInputElement>(null);
  const cccdBackInputRef = useRef<HTMLInputElement>(null);
  const cvFileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string" && onUpdateAvatar) {
          onUpdateAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleDeleteAvatar = () => {
    if (onUpdateAvatar) {
      onUpdateAvatar("");
    }
  };

  const handleCccdFrontSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string" && onUpdateCccdFront) {
          onUpdateCccdFront(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleDeleteCccdFront = () => {
    if (onUpdateCccdFront) {
      onUpdateCccdFront("");
    }
  };

  const handleCccdBackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string" && onUpdateCccdBack) {
          onUpdateCccdBack(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleDeleteCccdBack = () => {
    if (onUpdateCccdBack) {
      onUpdateCccdBack("");
    }
  };

  const handleCvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string" && onUpdateCvFile) {
          onUpdateCvFile({
            cvFile: reader.result,
            cvFileName: file.name,
            cvFileSize: formatFileSize(file.size),
          });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const cvDisplayName =
    user.cvFileName ||
    (user.cvFile
      ? `CV_${user.name.replace(/\s+/g, "_")}.pdf`
      : "");
  const cvDisplaySize = user.cvFileSize || "";
  const hasCv = Boolean(user.cvFile || user.cvFileName);
  const isPdf =
    cvDisplayName.toLowerCase().endsWith(".pdf") ||
    (!cvDisplayName.toLowerCase().endsWith(".doc") &&
      !cvDisplayName.toLowerCase().endsWith(".docx"));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isAdminViewing && onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-[#44474e] dark:text-[#c4c6cf] hover:text-[#002046] dark:hover:text-white hover:bg-[#efedf1] dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Quay lại"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          )}
          <h2 className="text-2xl font-bold text-[#1a1b1e] dark:text-white tracking-tight">
            Thông tin tài khoản
          </h2>
        </div>
      </div>

      {/* Main Content Layout: 2 Columns on Desktop & Tablet, 1 Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (4 cols): Hồ sơ cá nhân (Avatar + Tên + CCCD) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-white dark:bg-[#25262b] border border-[#E2E8F0] dark:border-[#3b3d45] rounded-2xl p-5 shadow-xs flex flex-col items-center text-center relative h-full">
            {/* Interactive Avatar Container */}
            <div
              className="relative mb-3 group cursor-pointer"
              onClick={() => {
                if (user.avatar) {
                  setPreviewModal({ title: "Ảnh đại diện", url: user.avatar, side: "avatar" });
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white dark:border-[#1a1b1e] shadow-md transition-all group-hover:brightness-90"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#1b365d] text-white flex items-center justify-center text-2xl sm:text-3xl font-bold border-4 border-white dark:border-[#1a1b1e] shadow-md transition-all group-hover:brightness-90">
                  {user.initials || user.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Edit Camera Badge */}
              <div className="absolute bottom-0 right-0 bg-accent hover:opacity-90 text-white p-1.5 sm:p-2 rounded-full border-2 border-white dark:border-[#1a1b1e] shadow-sm flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <h3 className="text-lg sm:text-xl font-bold text-[#1a1b1e] dark:text-white">
              {user.name}
            </h3>

            {isAdmin ? (
              <span className="mt-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Quản trị viên
              </span>
            ) : (
              <>
                {/* Hidden inputs for CCCD and CV */}
                <input
                  type="file"
                  ref={cccdFrontInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleCccdFrontSelect}
                />
                <input
                  type="file"
                  ref={cccdBackInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleCccdBackSelect}
                />
                <input
                  type="file"
                  ref={cvFileInputRef}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleCvFileSelect}
                />

                {/* CCCD Photos Section */}
                <div className="w-full mt-4 pt-3.5 border-t border-[#E2E8F0] dark:border-[#3b3d45] text-left">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-[#1b365d] dark:text-[#87a0cd] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[17px]">badge</span>
                      <span>Ảnh chụp CCCD</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {/* CCCD Mặt trước */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Mặt trước
                      </span>

                      {user.cccdFront ? (
                        <div
                          onClick={() =>
                            setPreviewModal({
                              title: "CCCD - Mặt trước",
                              url: user.cccdFront!,
                              side: "front",
                            })
                          }
                          className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1b1e] overflow-hidden h-28 sm:h-32 cursor-pointer shadow-2xs"
                        >
                          <img
                            src={user.cccdFront}
                            alt="CCCD Mặt trước"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="p-1 rounded-full bg-white/90 text-slate-800 text-[15px] material-symbols-outlined shadow-xs">
                              zoom_in
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => cccdFrontInputRef.current?.click()}
                          className="h-28 sm:h-32 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-[#1a1b1e]/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-400 transition-all cursor-pointer flex flex-col items-center justify-center p-2 text-center group/empty"
                        >
                          <span className="material-symbols-outlined text-slate-400 group-hover/empty:text-blue-500 text-[22px] mb-1 transition-colors">
                            add_a_photo
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 group-hover/empty:text-blue-500 transition-colors">
                            Tải ảnh lên
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CCCD Mặt sau */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Mặt sau
                      </span>

                      {user.cccdBack ? (
                        <div
                          onClick={() =>
                            setPreviewModal({
                              title: "CCCD - Mặt sau",
                              url: user.cccdBack!,
                              side: "back",
                            })
                          }
                          className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1a1b1e] overflow-hidden h-28 sm:h-32 cursor-pointer shadow-2xs"
                        >
                          <img
                            src={user.cccdBack}
                            alt="CCCD Mặt sau"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="p-1 rounded-full bg-white/90 text-slate-800 text-[15px] material-symbols-outlined shadow-xs">
                              zoom_in
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => cccdBackInputRef.current?.click()}
                          className="h-28 sm:h-32 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-[#1a1b1e]/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-400 transition-all cursor-pointer flex flex-col items-center justify-center p-2 text-center group/empty"
                        >
                          <span className="material-symbols-outlined text-slate-400 group-hover/empty:text-blue-500 text-[22px] mb-1 transition-colors">
                            add_a_photo
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 group-hover/empty:text-blue-500 transition-colors">
                            Tải ảnh lên
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column (8 cols): Thông tin chi tiết + Thông tin tài khoản + Hồ sơ CV */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-white dark:bg-[#25262b] border border-[#E2E8F0] dark:border-[#3b3d45] rounded-2xl shadow-xs overflow-hidden h-full flex flex-col">
            {/* Header & Actions */}
            <div className="bg-[#F8FAFC] dark:bg-[#1f2023] px-4 sm:px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#3b3d45] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm sm:text-base text-[#1a1b1e] dark:text-[#d6e3ff] flex items-center gap-2">
                <span className="material-symbols-outlined text-accent text-[20px]">badge</span>
                <span>Thông tin chi tiết</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={onOpenChangePassword}
                  className="px-3 py-1.5 border border-accent text-accent font-semibold text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                  <span>Đổi mật khẩu</span>
                </button>
                <button
                  onClick={onOpenEditProfile}
                  className="px-3 py-1.5 bg-accent text-white font-semibold text-xs rounded-lg hover:opacity-90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <span>Chỉnh sửa thông tin</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 sm:space-y-4 flex-1 flex flex-col justify-between">
              {/* Nhóm 1: Thông tin cá nhân */}
              <div>
                <h4 className="text-xs font-bold text-[#002046] dark:text-[#87a0cd] uppercase tracking-wider mb-2.5 pb-1.5 border-b border-[#E2E8F0] dark:border-[#3b3d45]">
                  Thông tin cá nhân
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#74777f] dark:text-[#8e9099] mb-0.5">
                      Họ và tên
                    </label>
                    <p className="text-sm font-semibold text-[#1a1b1e] dark:text-white">
                      {user.name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#74777f] dark:text-[#8e9099] mb-0.5">
                      Ngày sinh
                    </label>
                    <p className="text-sm font-semibold text-[#1a1b1e] dark:text-white">
                      {user.dob || <span className="text-sm text-[#74777f] italic font-normal">Chưa cập nhật</span>}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#74777f] dark:text-[#8e9099] mb-0.5">
                      Email
                    </label>
                    <p
                      className="text-sm font-semibold text-[#1a1b1e] dark:text-white truncate"
                      title={user.email}
                    >
                      {user.email}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#74777f] dark:text-[#8e9099] mb-0.5">
                      Số điện thoại
                    </label>
                    <p className="text-sm font-semibold text-[#1a1b1e] dark:text-white">
                      {user.phone ? formatPhoneNumber(user.phone) : <span className="text-sm text-[#74777f] italic font-normal">Chưa cập nhật</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Thông tin tài khoản */}
              <div>
                <h4 className="text-xs font-bold text-[#002046] dark:text-[#87a0cd] uppercase tracking-wider mb-2.5 pb-1.5 border-b border-[#E2E8F0] dark:border-[#3b3d45]">
                  Thông tin tài khoản
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#74777f] dark:text-[#8e9099] mb-0.5">
                      Vai trò
                    </label>
                    <p className="text-sm font-semibold text-[#1a1b1e] dark:text-white">
                      {user.role}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#74777f] dark:text-[#8e9099] mb-0.5">
                      Ngày đăng ký
                    </label>
                    <p className="text-sm font-semibold text-[#1a1b1e] dark:text-white">
                      {user.registerDate || user.joinDate || <span className="text-sm text-[#74777f] italic font-normal">Chưa cập nhật</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nhóm 3: Hồ sơ ứng tuyển (CV) - Chỉ hiển thị cho CTV */}
              {!isAdmin && (
                <div className="pt-1">
                  <h4 className="text-xs font-bold text-[#002046] dark:text-[#87a0cd] uppercase tracking-wider mb-2 pb-1.5 border-b border-[#E2E8F0] dark:border-[#3b3d45] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[17px]">description</span>
                    <span>Hồ sơ ứng tuyển (CV)</span>
                  </h4>

                  {hasCv ? (
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#1a1b1e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            isPdf
                              ? "bg-red-50 text-red-600 border border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/60"
                              : "bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/60"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isPdf ? "picture_as_pdf" : "description"}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-bold text-[#1a1b1e] dark:text-white truncate"
                            title={cvDisplayName}
                          >
                            {cvDisplayName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {cvDisplaySize}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons: Xem & Thay đổi */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (user.cvFile) window.open(user.cvFile, "_blank");
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-[#25262b] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title="Xem CV trong tab mới"
                        >
                          <span className="material-symbols-outlined text-[16px] text-blue-600">
                            open_in_new
                          </span>
                          <span>Xem</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => cvFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Chọn file mới thay thế"
                        >
                          <span className="material-symbols-outlined text-[16px]">upload_file</span>
                          <span>Thay đổi</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => cvFileInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-[#1a1b1e]/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-400 transition-all cursor-pointer p-3 text-center group/cv flex items-center justify-center gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover/cv:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[17px]">upload_file</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover/cv:text-blue-600 transition-colors">
                          Tải file CV lên
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Định dạng PDF, Word (.pdf, .doc, .docx)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CCCD Image Preview Lightbox Modal */}
      {previewModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="bg-white dark:bg-[#25262b] rounded-2xl max-w-2xl w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">
                  {previewModal.side === "avatar" ? "account_circle" : "badge"}
                </span>
                <span>{previewModal.title}</span>
              </h3>
              <button
                onClick={() => setPreviewModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-slate-100 dark:bg-black/40 flex items-center justify-center max-h-[60vh] p-3 min-h-[220px]">
              <img
                src={previewModal.url}
                alt={previewModal.title}
                className="max-h-[55vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>

            {/* Action Buttons strictly below the image */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700 mt-3">
              <button
                type="button"
                onClick={() => {
                  const side = previewModal.side;
                  setPreviewModal(null);
                  if (side === "avatar") {
                    fileInputRef.current?.click();
                  } else if (side === "front") {
                    cccdFrontInputRef.current?.click();
                  } else {
                    cccdBackInputRef.current?.click();
                  }
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Thay đổi ảnh"
              >
                <span className="material-symbols-outlined text-[16px]">file_upload</span>
                <span>Thay đổi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const side = previewModal.side;
                  setPreviewModal(null);
                  if (side === "avatar") {
                    handleDeleteAvatar();
                  } else if (side === "front") {
                    handleDeleteCccdFront();
                  } else {
                    handleDeleteCccdBack();
                  }
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Xóa ảnh"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileScreen;
