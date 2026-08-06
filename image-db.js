/**
 * ============================================
 * ImageDB
 * Collection Book V3.1
 * 使用 IndexedDB 儲存收藏圖片
 * ============================================
 */

const ImageDB = (() => {
  const DB_NAME = 'CollectionBookImages';
  const DB_VERSION = 1;
  const STORE_NAME = 'photos';

  let dbInstance = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: 'id'
          });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.error('ImageDB 開啟失敗：', request.error);
        reject(request.error);
      };
    });
  }

function saveImage(imageData) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await open();

      const imageId =
        'img-' +
        Date.now() +
        '-' +
        Math.random().toString(36).slice(2, 8);

      const transaction = db.transaction(
        STORE_NAME,
        'readwrite'
      );

      const store = transaction.objectStore(STORE_NAME);

      const request = store.add({
        id: imageId,
        data: imageData,
        createdAt: new Date().toISOString()
      });

      request.onsuccess = () => {
        resolve(imageId);
      };

      request.onerror = () => {
        console.error('ImageDB 儲存圖片失敗：', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

function getImage(imageId) {
  return new Promise(async (resolve, reject) => {

    try {

      const db = await open();

      const transaction = db.transaction(
        STORE_NAME,
        'readonly'
      );

      const store = transaction.objectStore(STORE_NAME);

      const request = store.get(imageId);

      request.onsuccess = () => {

        if (!request.result) {
          resolve(null);
          return;
        }

        resolve(request.result.data);

      };

      request.onerror = () => {

        console.error(
          'ImageDB 讀取圖片失敗：',
          request.error
        );

        reject(request.error);

      };

    } catch (err) {

      reject(err);

    }

  });
}

function deleteImage(imageId) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await open();

      const transaction = db.transaction(
        STORE_NAME,
        'readwrite'
      );

      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(imageId);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error(
          'ImageDB 刪除圖片失敗：',
          request.error
        );

        reject(request.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

function clearAllImages() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await open();

      const transaction = db.transaction(
        STORE_NAME,
        'readwrite'
      );

      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error(
          'ImageDB 清空圖片失敗：',
          request.error
        );

        reject(request.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

return {
  open,
  saveImage,
  getImage,
  deleteImage,
  clearAllImages
};

})();