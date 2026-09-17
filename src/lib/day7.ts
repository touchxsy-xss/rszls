import { listConfirmedMemoryCardsForDay7, type MemoryCardRow } from "@/lib/database";

export type Day7Card = MemoryCardRow & { representative_asset_id: string | null; representative_asset_type: "AUDIO" | "IMAGE" | "VIDEO" | null };

export function buildDay7Draft(displayName: string, cards: Day7Card[]) {
  const selected = cards.slice(0, 7);
  return {
    title: "《我的 7 个故事》",
    intro: `${displayName} 留下的 ${selected.length} 段记忆。这里的每一段，都来自本人选择保留的记录。`,
    closing: "这些故事先留在这里。以后想起新的细节，还可以继续补上。",
    cards: selected,
  };
}

export function getDay7Cards(userId: string) {
  return listConfirmedMemoryCardsForDay7(userId);
}

function pdfText(value: string) {
  const bytes = Buffer.from(value, "utf16le");
  const swapped = Buffer.alloc(bytes.length);
  for (let index = 0; index < bytes.length; index += 2) {
    swapped[index] = bytes[index + 1] ?? 0;
    swapped[index + 1] = bytes[index] ?? 0;
  }
  return `<FEFF${swapped.toString("hex").toUpperCase()}>`;
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Build a small self-contained PDF using the standard Simplified Chinese font. */
export function renderDay7Pdf(draft: ReturnType<typeof buildDay7Draft>) {
  const lines = [draft.title, draft.intro, ...draft.cards.flatMap((card, index) => {
    const title = card.user_title ?? card.ai_title;
    const story = card.user_story ?? card.ai_story;
    return [`${index + 1}. ${title}`, card.time_label ?? "", story, `原话：${card.ai_original_quote}`];
  }), draft.closing].filter(Boolean);
  const linesPerPage = 27;
  const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
  const fontObject = 3 + pageCount * 2;
  const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
    const pageObject = 3 + pageIndex * 2;
    const contentObject = pageObject + 1;
    const pageLines = lines.slice(pageIndex * linesPerPage, (pageIndex + 1) * linesPerPage);
    const commands = ["BT", "/F1 14 Tf", "50 790 Td", ...pageLines.map((line, index) => `${index ? "0 -24 Td" : ""} ${escapePdf(pdfText(line))} Tj`), "ET"].join("\n");
    return {
      pageObject,
      contentObject,
      page: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`,
      content: `<< /Length ${Buffer.byteLength(commands, "utf8")} >>\nstream\n${commands}\nendstream`,
    };
  });
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((page) => `${page.pageObject} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    ...pages.flatMap((page) => [page.page, page.content]),
    "<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [" + `${fontObject + 1} 0 R` + "] >>",
    "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> >>",
  ];
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "binary");
}
