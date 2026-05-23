import api from './api';

const shipmentService = {
  getShipments: async (filters = {}) => {
    const response = await api.get('/shipments', { params: filters });
    return response.data.data;
  },

  getShipmentById: async (id) => {
    const response = await api.get(`/shipments/${id}`);
    return response.data.data;
  },

  createShipment: async (shipmentData) => {
    const response = await api.post('/shipments', shipmentData);
    return response.data.data;
  },

  updateShipment: async (id, shipmentData) => {
    const response = await api.put(`/shipments/${id}`, shipmentData);
    return response.data.data;
  },

  assignShipment: async (id, assignData) => {
    const response = await api.put(`/shipments/${id}/assign`, assignData);
    return response.data.data;
  },

  updateShipmentStatus: async (id, statusData) => {
    const response = await api.put(`/shipments/${id}/status`, statusData);
    return response.data.data;
  },

  addComment: async (id, commentText) => {
    const response = await api.post(`/shipments/${id}/comments`, { comment: commentText });
    return response.data.data;
  },

  deliverShipment: async (id, file, signedBy) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('signedBy', signedBy);

    const response = await api.post(`/shipments/${id}/deliver`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  deleteShipment: async (id) => {
    const response = await api.delete(`/shipments/${id}`);
    return response.data;
  },
};

export default shipmentService;
