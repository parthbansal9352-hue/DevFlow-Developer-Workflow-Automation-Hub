/**
 * Unified Appwrite Database Adapter
 * Primary: Appwrite TablesDB (Rows/Tables)
 * Fallback: Appwrite Databases (Documents/Collections) for backwards compatibility
 */

import { tablesDB, databases, APPWRITE_CONFIG } from '../config/appwrite';

const databaseId = APPWRITE_CONFIG.databaseId;

export const dbAdapter = {
  /**
   * List rows or documents from a table/collection
   * @param {string} tableId
   * @param {string[]} [queries=[]]
   */
  async list(tableId, queries = []) {
    try {
      const res = await tablesDB.listRows({
        databaseId,
        tableId,
        queries,
      });
      return {
        total: res.total,
        items: res.rows || [],
      };
    } catch (err) {
      // If TablesDB route is not found or unsupported, fallback to Databases
      if (err?.code === 404 || err?.type === 'general_route_not_found') {
        const docRes = await databases.listDocuments(databaseId, tableId, queries);
        return {
          total: docRes.total,
          items: docRes.documents || [],
        };
      }
      throw err;
    }
  },

  /**
   * Create a new row or document
   * @param {string} tableId
   * @param {string} rowId
   * @param {object} data
   * @param {string[]} permissions
   */
  async create(tableId, rowId, data, permissions = []) {
    try {
      return await tablesDB.createRow({
        databaseId,
        tableId,
        rowId,
        data,
        permissions,
      });
    } catch (err) {
      if (err?.code === 404 || err?.type === 'general_route_not_found') {
        return await databases.createDocument(databaseId, tableId, rowId, data, permissions);
      }
      throw err;
    }
  },

  /**
   * Get a row or document by ID
   * @param {string} tableId
   * @param {string} rowId
   */
  async get(tableId, rowId) {
    try {
      return await tablesDB.getRow({
        databaseId,
        tableId,
        rowId,
      });
    } catch (err) {
      if (err?.code === 404 || err?.type === 'general_route_not_found') {
        return await databases.getDocument(databaseId, tableId, rowId);
      }
      throw err;
    }
  },

  /**
   * Update a row or document by ID
   * @param {string} tableId
   * @param {string} rowId
   * @param {object} data
   * @param {string[]} [permissions]
   */
  async update(tableId, rowId, data, permissions) {
    try {
      return await tablesDB.updateRow({
        databaseId,
        tableId,
        rowId,
        data,
        permissions,
      });
    } catch (err) {
      if (err?.code === 404 || err?.type === 'general_route_not_found') {
        return await databases.updateDocument(databaseId, tableId, rowId, data, permissions);
      }
      throw err;
    }
  },

  /**
   * Delete a row or document by ID
   * @param {string} tableId
   * @param {string} rowId
   */
  async delete(tableId, rowId) {
    try {
      return await tablesDB.deleteRow({
        databaseId,
        tableId,
        rowId,
      });
    } catch (err) {
      if (err?.code === 404 || err?.type === 'general_route_not_found') {
        return await databases.deleteDocument(databaseId, tableId, rowId);
      }
      throw err;
    }
  },
};
