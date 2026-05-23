import api from './api';

const analyticsService = {
  getKPIs: async () => {
    const response = await api.get('/analytics/kpis');
    return response.data.data;
  },

  getChartData: async () => {
    const response = await api.get('/analytics/charts');
    return response.data.data;
  },
};

export default analyticsService;
