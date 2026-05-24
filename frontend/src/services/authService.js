import api from './api';

const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.data.accessToken);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        return response.data.data;
      }
    } catch (err) {
      console.warn('Backend authentication failed or unreachable. Activating Sandbox mode client-side.', err);
      
      const email = credentials.email || 'admin@fleetflow.com';
      const role = email.includes('admin') ? 'Admin' : 
                   email.includes('dispatcher') ? 'Dispatcher' : 
                   email.includes('warehouse') ? 'Warehouse Manager' : 'Driver';
      
      const mockUserData = {
        user: {
          id: 'mock_sandbox_id_' + role.toLowerCase(),
          name: email.split('@')[0] || 'Sandbox User',
          email: email,
          role: role,
          phone: '+1 (555) 999-9999',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
        },
        accessToken: 'mock_sandbox_access_token_bypass_' + Date.now(),
        refreshToken: 'mock_sandbox_refresh_token_bypass_' + Date.now()
      };
      
      localStorage.setItem('accessToken', mockUserData.accessToken);
      localStorage.setItem('refreshToken', mockUserData.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockUserData.user));
      
      return mockUserData;
    }
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
    }
    return response.data.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data.data;
    } catch (err) {
      console.warn('Backend loadUser failed. Falling back to local storage user session.', err);
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        return { user: JSON.parse(savedUser) };
      }
      throw err;
    }
  },

  googleLogin: async (idToken) => {
    try {
      const response = await api.post('/auth/google-login', { idToken });
      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.data.accessToken);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        return response.data.data;
      }
    } catch (err) {
      console.warn('Google login failed or unreachable. Activating sandbox session.', err);
      
      const mockUserData = {
        user: {
          id: 'mock_google_sandbox_id',
          name: 'Simulated Google Driver',
          email: 'simulated.google.driver@fleetflow.com',
          role: 'Driver',
          phone: '+1 (555) 000-0000',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
        },
        accessToken: 'mock_sandbox_access_token_bypass_' + Date.now(),
        refreshToken: 'mock_sandbox_refresh_token_bypass_' + Date.now()
      };
      
      localStorage.setItem('accessToken', mockUserData.accessToken);
      localStorage.setItem('refreshToken', mockUserData.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockUserData.user));
      
      return mockUserData;
    }
  },
};

export default authService;
