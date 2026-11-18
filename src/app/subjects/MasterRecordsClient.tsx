"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  X,
  AlertCircle,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";

interface RecordItem {
  id: number;
  name?: string;
  code?: string;
  capacity?: number;
  label?: string;
  start_time?: string;
  end_time?: string;
}

interface MasterRecordsClientProps {
  entityType: "subject" | "group" | "room" | "timeslot";
  initialItems: RecordItem[];
  title: string;
  singularTitle: string;
}

export function MasterRecordsClient({
  entityType,
  initialItems,
  title,
  singularTitle,
}: MasterRecordsClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:50");

  // Excel / CSV Bulk Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<{ name: string; code: string }[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const endpoint = `/api/${entityType === "group" ? "groups" : entityType + "s"}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: any = {};
    if (entityType === "subject") {
      payload.name = name;
      payload.code = code;
    } else if (entityType === "group") {
      payload.name = name;
    } else if (entityType === "room") {
      payload.name = name;
      payload.capacity = capacity;
    } else if (entityType === "timeslot") {
      payload.label = label;
      payload.start_time = startTime;
      payload.end_time = endTime;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create record");
        setLoading(false);
        return;
      }

      setModalOpen(false);
      setName("");
      setCode("");
      router.refresh();
    } catch {
      setError("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete this ${singularTitle.toLowerCase()}?`)) return;

    try {
      const res = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Network error");
    }
  };

  // Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const wsData = [
      ["Subject Name", "Subject Code"],
      ["Artificial Intelligence & Robotics", "AI501"],
      ["Cloud Computing & DevOps", "CC402"],
      ["Machine Learning Algorithms", "ML502"],
      ["Information Security & Cyber Law", "IS504"],
      ["Mobile Application Development", "MAD403"],
      ["Data Warehousing & Mining", "DWM404"],
      ["Software Testing & Quality Assurance", "STQA405"],
      ["Big Data Analytics", "BDA505"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subjects");
    XLSX.writeFile(wb, "subjects_sample_template.xlsx");
  };

  // Parse Excel / CSV file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        const rows: { name: string; code: string }[] = [];
        for (const r of rawJson) {
          const subName =
            r["Subject Name"] ||
            r["subject_name"] ||
            r["Name"] ||
            r["name"] ||
            r["Subject"] ||
            "";
          const subCode =
            r["Subject Code"] ||
            r["subject_code"] ||
            r["Code"] ||
            r["code"] ||
            "";

          if (subName && subCode) {
            rows.push({
              name: String(subName).trim(),
              code: String(subCode).trim().toUpperCase(),
            });
          }
        }

        if (rows.length === 0) {
          setImportError(
            "No valid subject records found. Please ensure headers are 'Subject Name' and 'Subject Code'."
          );
          setParsedRows([]);
        } else {
          setParsedRows(rows);
        }
      } catch (err: any) {
        setImportError("Failed to parse file: " + err.message);
        setParsedRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Bulk Import
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: parsedRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Failed to import subjects");
        setImporting(false);
        return;
      }

      setImportSuccess(`Successfully imported ${data.importedCount || parsedRows.length} subjects!`);
      setTimeout(() => {
        setImportModalOpen(false);
        setParsedRows([]);
        setUploadedFileName("");
        setImportSuccess(null);
        router.refresh();
      }, 1500);
    } catch {
      setImportError("Network error while importing subjects.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total of {initialItems.length} registered {title.toLowerCase()} in database.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {entityType === "subject" && (
            <button
              onClick={() => {
                setImportError(null);
                setImportSuccess(null);
                setParsedRows([]);
                setUploadedFileName("");
                setImportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#EBF3FA] hover:bg-[#DCEBF7] text-[#2F5D8A] border border-[rgba(47,93,138,0.2)] text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Excel / CSV</span>
            </button>
          )}

          <button
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#2F5D8A] text-white text-xs font-semibold hover:bg-[#244A70] transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add {singularTitle}</span>
          </button>
        </div>
      </div>

      {initialItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                {entityType === "subject" && (
                  <>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Code</th>
                  </>
                )}
                {entityType === "group" && <th className="py-3 px-4">Name / Title</th>}
                {entityType === "room" && (
                  <>
                    <th className="py-3 px-4">Room / Lab</th>
                    <th className="py-3 px-4">Capacity</th>
                  </>
                )}
                {entityType === "timeslot" && (
                  <>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Start Time</th>
                    <th className="py-3 px-4">End Time</th>
                  </>
                )}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  {entityType === "subject" && (
                    <>
                      <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {item.code}
                        </span>
                      </td>
                    </>
                  )}
                  {entityType === "group" && (
                    <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                  )}
                  {entityType === "room" && (
                    <>
                      <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                      <td className="py-3 px-4 text-slate-600">{item.capacity} seats</td>
                    </>
                  )}
                  {entityType === "timeslot" && (
                    <>
                      <td className="py-3 px-4 font-medium text-slate-800">{item.label}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{item.start_time}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{item.end_time}</td>
                    </>
                  )}
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 text-xs">
          No {title.toLowerCase()} configured yet. Click above to add or import.
        </div>
      )}

      {/* Manual Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[420px] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Add New {singularTitle}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {(entityType === "subject" || entityType === "group" || entityType === "room") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {singularTitle} Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder={`e.g. ${
                      entityType === "subject"
                        ? "Algorithms"
                        : entityType === "group"
                        ? "BCA Sem 3 A"
                        : "Lab 101"
                    }`}
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              )}

              {entityType === "subject" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="e.g. CS301"
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              )}

              {entityType === "room" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                  />
                </div>
              )}

              {entityType === "timeslot" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Period Label</label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      required
                      placeholder="e.g. Period 1"
                      className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="w-full text-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:border-[#2F5D8A]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-[#2F5D8A] text-white rounded-md hover:bg-[#244A70] disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {loading ? "Saving..." : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel / CSV Bulk Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-[560px] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Bulk Import Subjects via Excel / CSV</h3>
                  <p className="text-[11px] text-slate-500">Quickly add dozens of subjects in one go</p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{importSuccess}</span>
              </div>
            )}

            {importError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Template Download Prompt */}
            <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <div className="font-semibold text-slate-800">Need a starting template?</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Headers required: <code className="bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-700 font-mono text-[10px]">Subject Name</code> and <code className="bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-700 font-mono text-[10px]">Subject Code</code>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold shadow-2xs hover:bg-slate-50 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Template (.xlsx)</span>
              </button>
            </div>

            {/* Upload Zone */}
            <div className="mb-4">
              <label className="block border-2 border-dashed border-slate-300 hover:border-[#2F5D8A] bg-slate-50/50 hover:bg-[#EBF3FA]/30 rounded-xl p-6 text-center cursor-pointer transition-all">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-700 block">
                  {uploadedFileName ? uploadedFileName : "Click or drag & drop Excel / CSV file"}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Supports .xlsx, .xls, and .csv files
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview Section */}
            {parsedRows.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Preview ({parsedRows.length} subjects found)</span>
                  <span className="text-[11px] text-emerald-600 font-medium">Ready to import</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 text-[11px]">
                      <tr>
                        <th className="py-1.5 px-3">#</th>
                        <th className="py-1.5 px-3">Subject Name</th>
                        <th className="py-1.5 px-3">Subject Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedRows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1 px-3 text-slate-400 text-[10px]">{idx + 1}</td>
                          <td className="py-1 px-3 text-slate-800 font-medium">{row.name}</td>
                          <td className="py-1 px-3 text-slate-600 font-mono text-[10px]">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {row.code}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {parsedRows.length > 15 && (
                        <tr>
                          <td colSpan={3} className="py-1.5 px-3 text-center text-slate-400 text-[10px] bg-slate-50">
                            + {parsedRows.length - 15} more subjects will be imported
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedRows.length === 0 || importing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#2F5D8A] text-white rounded-md hover:bg-[#244A70] disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {importing ? "Importing..." : `Import ${parsedRows.length > 0 ? parsedRows.length : ""} Subjects`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
