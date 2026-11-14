import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DAYS_OF_WEEK } from "./types";

interface ExportTimetableParams {
  title: string;
  subtitle: string;
  timeslots: { id: number; label: string; start_time: string; end_time: string }[];
  matrix: Record<string, Record<number, any>>;
  filename?: string;
}

export function exportTimetableToPDF({
  title,
  subtitle,
  timeslots,
  matrix,
  filename = "timetable.pdf",
}: ExportTimetableParams) {
  // Landscape A4 for wide timetable grid
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Header band
  doc.setFillColor(47, 93, 138); // #2F5D8A
  doc.rect(0, 0, 297, 22, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TIMETABLE PORTAL", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), 14, 18);

  // Subtitle / Date stamp
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(
    `${subtitle}  •  Generated on ${new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`,
    14,
    30
  );

  // Columns: Day + each timeslot
  const head = [
    [
      "Day",
      ...timeslots.map((ts) => `${ts.label}\n(${ts.start_time} - ${ts.end_time})`),
    ],
  ];

  // Rows for each day
  const body: string[][] = DAYS_OF_WEEK.map((day) => {
    const row: string[] = [day];
    timeslots.forEach((ts) => {
      const slot = matrix[day]?.[ts.id];
      if (slot) {
        let cellText = `${slot.subject_name || ""}`;
        if (slot.subject_code) cellText += ` (${slot.subject_code})`;
        if (slot.faculty_name) cellText += `\n${slot.faculty_name}`;
        if (slot.group_name) cellText += `\n${slot.group_name}`;
        if (slot.room_name) cellText += `\n${slot.room_name}`;
        row.push(cellText);
      } else {
        row.push("—");
      }
    });
    return row;
  });

  autoTable(doc, {
    startY: 34,
    head: head,
    body: body,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: "middle",
      halign: "center",
      lineColor: [226, 232, 240], // #E2E8F0
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 50, 70],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    columnStyles: {
      0: {
        fontStyle: "bold",
        fillColor: [248, 250, 252],
        halign: "left",
        cellWidth: 26,
      },
    },
    alternateRowStyles: {
      fillColor: [253, 254, 255],
    },
    didParseCell: (data) => {
      // Highlight filled class cells with a gentle blue tint
      if (data.section === "body" && data.column.index > 0 && data.cell.raw !== "—") {
        data.cell.styles.fillColor = [235, 243, 250]; // #EBF3FA
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Faculty & Timetable Management System  |  Page ${i} of ${pageCount}`,
      14,
      202
    );
  }

  doc.save(filename);
}
