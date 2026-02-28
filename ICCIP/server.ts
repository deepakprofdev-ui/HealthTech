import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Supabase environment variables are missing!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// Health Check / Connection Verify
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({
      status: 'ok',
      supabase: 'connected',
      config: {
        url: supabaseUrl ? 'set' : 'missing',
        key: supabaseKey ? 'set' : 'missing'
      }
    });
  } catch (e: any) {
    res.status(500).json({
      status: 'error',
      message: e.message,
      config: {
        url: supabaseUrl ? 'set' : 'missing',
        key: supabaseKey ? 'set' : 'missing'
      }
    });
  }
});

// Auth Routes
app.get('/api/doctors', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'physician');

  if (error) return res.status(500).json({ error: error.message });

  // Group by specialization
  const grouped = data.reduce((acc: any, doc: any) => {
    const spec = doc.specialization || 'General';
    if (!acc[spec]) acc[spec] = [];
    acc[spec].push(doc);
    return acc;
  }, {});

  res.json(grouped);
});

app.get('/api/patients', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'patient');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Update user profile
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const updates: any = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (password) updates.password = password;

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, role, specialization, license_number, hospital_name } = req.body;
  console.log('Signup attempt:', email);

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        email,
        password,
        name,
        role: role || 'patient',
        specialization,
        license_number,
        hospital_name
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Signup error details:', JSON.stringify(error, null, 2));
    return res.status(400).json({
      error: error.message || 'User already exists or invalid data',
      details: error
    });
  }
  res.json(data);
});

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;
  console.log('Signin attempt:', email);
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .maybeSingle();

  if (error) {
    console.error('Signin error details:', error);
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json(data);
});

// Health Records Routes
app.get('/api/records/:userId', async (req, res) => {
  const { data, error } = await supabase
    .from('health_records')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('timestamp', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/records', async (req, res) => {
  const { userId, type, data: recordData, routine_type } = req.body;
  const { data, error } = await supabase
    .from('health_records')
    .insert([{ user_id: userId, type, data: recordData, routine_type }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Alerts Routes
app.get('/api/alerts/:userId', async (req, res) => {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('timestamp', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/alerts', async (req, res) => {
  const { userId, message, type } = req.body;
  const { data, error } = await supabase
    .from('alerts')
    .insert([{ user_id: userId, message, type }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  io.to(`user_${userId}`).emit('new_alert', data);
  res.json(data);
});

// Chat history between two users
app.get('/api/messages', async (req, res) => {
  const { userId1, userId2 } = req.query;
  if (!userId1 || !userId2) return res.status(400).json({ error: 'userId1 and userId2 required' });
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Reports
app.get('/api/reports/monthly/:userId', async (req, res) => {
  const { data: records, error: recError } = await supabase
    .from('health_records')
    .select('*')
    .eq('user_id', req.params.userId);

  if (recError) return res.status(500).json({ error: recError.message });

  // In a real app, you might cache this or run it on a schedule
  // For now, we'll just return a placeholder or trigger AI if needed
  res.json({
    userId: req.params.userId,
    month: new Date().toLocaleString('default', { month: 'long' }),
    averageRisk: 45,
    keyEvents: ["Heart rate spike on 12th", "Consistent sleep improvement"],
    clinicalSummary: "Patient is stable with minor fluctuations in resting heart rate."
  });
});

// Socket.io for live physician-patient interaction
io.on('connection', (socket) => {
  socket.on('join_room', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, message } = data;

    const { data: msgData, error } = await supabase
      .from('chat_messages')
      .insert([{ sender_id: senderId, receiver_id: receiverId, message }])
      .select()
      .single();

    if (!error) {
      io.to(`user_${receiverId}`).emit('receive_message', msgData);

      // AI Medical Keyword Analyzer
      try {
        const payload = typeof message === 'string' ? JSON.parse(message) : message;
        const text = payload.text || '';
        const criticalKeywords = ['chest pain', 'breathing', 'faint', 'severe pain', 'dizzy', 'emergency'];
        const isCritical = criticalKeywords.some((kw: string) => text.toLowerCase().includes(kw));

        if (isCritical) {
          io.to(`user_${receiverId}`).emit('critical_alert', {
            senderId, messageId: msgData.id,
            text: 'Critical medical keywords detected in patient message.'
          });
          io.to(`user_${senderId}`).emit('critical_alert', {
            senderId, messageId: msgData.id,
            text: 'Your message contains keywords implying an urgent condition. If this is a medical emergency, please call emergency services immediately.'
          });
        }
      } catch (e) {
        // If not json or parsing error, ignore AI check
      }
    }
  });

  socket.on('typing', ({ senderId, receiverId }) => {
    io.to(`user_${receiverId}`).emit('user_typing', senderId);
  });

  socket.on('mark_read', async ({ messageIds, senderId }) => {
    // Mark messages as read by updating their JSON payload
    for (const id of messageIds) {
      const { data: msg } = await supabase.from('chat_messages').select('message').eq('id', id).single();
      if (msg) {
        try {
          const payload = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
          if (payload.status !== 'read') {
            payload.status = 'read';
            await supabase.from('chat_messages').update({ message: JSON.stringify(payload) }).eq('id', id);
          }
        } catch (e) { }
      }
    }
    io.to(`user_${senderId}`).emit('messages_read', messageIds);
  });

  socket.on('delete_message', async ({ messageId, userId, receiverId }) => {
    // Soft delete by updating JSON payload
    const { data: msg } = await supabase.from('chat_messages').select('message, sender_id').eq('id', messageId).single();
    if (msg && msg.sender_id === userId) {
      try {
        const payload = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
        payload.is_deleted = true;
        payload.text = '';
        payload.attachment = null;
        await supabase.from('chat_messages').update({ message: JSON.stringify(payload) }).eq('id', messageId);
        io.to(`user_${receiverId}`).emit('message_deleted', messageId);
        io.to(`user_${userId}`).emit('message_deleted', messageId);
      } catch (e) { }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  try {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } catch (err) {
    console.warn('Vite not found, assuming production build');
  }
} else if (process.env.VERCEL !== '1') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
