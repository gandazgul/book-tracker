import { createSheetReader, sheetLink, type SheetSource } from '../../shared/sheets';

export const sheetId = import.meta.env.PUBLIC_SHEET_ID || '11e9H7MEYZdOWZlKPdGITu-bvmHbw4N5szeoqd1Ordmk';
export const sheetGid = import.meta.env.PUBLIC_SHEET_GID || '0';
export const tbrGid = import.meta.env.PUBLIC_TBR_GID || '576515270';
export const readSource: SheetSource = { id: sheetId, gid: sheetGid, kind: 'read', label: 'Reading history' };
export const tbrSource: SheetSource = { id: sheetId, gid: tbrGid, kind: 'tbr', label: 'To Be Read' };
export const sheetUrl = sheetLink(readSource);
export const tbrUrl = sheetLink(tbrSource);
export const readReader = createSheetReader(readSource, () => localStorage);
export const tbrReader = createSheetReader(tbrSource, () => localStorage);
export const cachedLibrary = readReader.cached;
export const fetchLibrary = readReader.fetch;
