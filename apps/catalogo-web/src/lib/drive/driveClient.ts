import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

const APP_FOLDER_NAME = 'Oben Catalogos';

function getDriveClient(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

/** Busca (o crea si no existe) la carpeta de la app dentro del Drive del usuario.
 *  Con el scope 'drive.file', la app solo puede ver/tocar archivos y carpetas
 *  que ella misma creó - nunca el resto del Drive del usuario. */
async function getOrCreateAppFolder(drive: drive_v3.Drive): Promise<string> {
  const existing = await drive.files.list({
    q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: APP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });
  return folder.data.id!;
}

/** Marca un archivo como "cualquiera con el link puede ver" - así el
 *  catálogo se puede compartir con clientes sin que necesiten cuenta
 *  de Google ni permiso explícito. */
async function makePublic(drive: drive_v3.Drive, fileId: string) {
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });
}

export async function listCatalogFiles(accessToken: string) {
  const drive = getDriveClient(accessToken);
  const folderId = await getOrCreateAppFolder(drive);

  const res = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'catalog-' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
  });
  return res.data.files || [];
}

export async function getCatalogFile(accessToken: string, fileId: string) {
  const drive = getDriveClient(accessToken);
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
  return res.data;
}

export async function createCatalogFile(accessToken: string, catalogData: object) {
  const drive = getDriveClient(accessToken);
  const folderId = await getOrCreateAppFolder(drive);

  const fileName = `catalog-${Date.now()}.json`;
  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: {
      mimeType: 'application/json',
      body: Readable.from([JSON.stringify(catalogData)]),
    },
    fields: 'id',
  });

  const fileId = file.data.id!;
  await makePublic(drive, fileId);
  return fileId;
}

export async function updateCatalogFile(accessToken: string, fileId: string, catalogData: object) {
  const drive = getDriveClient(accessToken);
  await drive.files.update({
    fileId,
    media: {
      mimeType: 'application/json',
      body: Readable.from([JSON.stringify(catalogData)]),
    },
  });
}

export async function deleteCatalogFile(accessToken: string, fileId: string) {
  const drive = getDriveClient(accessToken);
  await drive.files.delete({ fileId });
}

export async function uploadImageFile(accessToken: string, fileName: string, mimeType: string, buffer: Buffer) {
  const drive = getDriveClient(accessToken);
  const folderId = await getOrCreateAppFolder(drive);

  const file = await drive.files.create({
    requestBody: { name: `img-${Date.now()}-${fileName}`, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id',
  });

  const fileId = file.data.id!;
  await makePublic(drive, fileId);
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// ==================== Archivo único de configuración del sitio (Enlaces) ====================
// A diferencia de los catálogos (varios por cuenta), aquí solo existe UN
// archivo "site-config.json" por cuenta de Drive - se busca por nombre fijo.

const SITE_CONFIG_FILENAME = 'site-config.json';

/** Busca el archivo de configuración del sitio del usuario. Devuelve null si no existe aún. */
export async function findSiteConfigFile(accessToken: string): Promise<string | null> {
  const drive = getDriveClient(accessToken);
  const folderId = await getOrCreateAppFolder(drive);

  const res = await drive.files.list({
    q: `'${folderId}' in parents and name='${SITE_CONFIG_FILENAME}' and trashed=false`,
    fields: 'files(id)',
  });

  return res.data.files && res.data.files.length > 0 ? res.data.files[0].id! : null;
}

/** Crea el archivo de configuración del sitio (solo la primera vez) y lo hace público. */
export async function createSiteConfigFile(accessToken: string, data: object): Promise<string> {
  const drive = getDriveClient(accessToken);
  const folderId = await getOrCreateAppFolder(drive);

  const file = await drive.files.create({
    requestBody: { name: SITE_CONFIG_FILENAME, parents: [folderId] },
    media: { mimeType: 'application/json', body: Readable.from([JSON.stringify(data)]) },
    fields: 'id',
  });

  const fileId = file.data.id!;
  await makePublic(drive, fileId);
  return fileId;
}

export async function updateSiteConfigFile(accessToken: string, fileId: string, data: object) {
  const drive = getDriveClient(accessToken);
  await drive.files.update({
    fileId,
    media: { mimeType: 'application/json', body: Readable.from([JSON.stringify(data)]) },
  });
}

export async function getSiteConfigFile(accessToken: string, fileId: string) {
  const drive = getDriveClient(accessToken);
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
  return res.data;
}
