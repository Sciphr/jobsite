// Server-Sent Events for real-time subscription notifications

// Use global to persist clients across hot reloads in development
if (!global.sseClients) {
  global.sseClients = new Set();
}
const clients = global.sseClients;

export async function GET(request) {
  // Create SSE connection
  const stream = new ReadableStream({
    start(controller) {
      const clientId = Math.random().toString(36).substr(2, 9);

      const client = {
        id: clientId,
        controller,
        send: (data) => {
          try {
            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          } catch (error) {
            console.error('Error sending SSE data:', error);
            clients.delete(client);
          }
        }
      };

      clients.add(client);
      console.log(`SSE client connected: ${clientId}, total clients: ${clients.size}`);
      console.log('Current clients:', Array.from(clients).map(c => c.id));
      console.log('Clients Set reference:', clients);

      // Send initial connection message
      client.send({
        type: 'connected',
        message: 'Connected to subscription notifications',
        clientId: clientId
      });

      // Handle client disconnect
      request.signal?.addEventListener('abort', () => {
        clients.delete(client);
        console.log(`SSE client disconnected: ${clientId}, remaining clients: ${clients.size}`);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

// Broadcast tier update to all connected clients
export function broadcastTierUpdate(newTier) {
  const message = {
    type: 'tier_updated',
    tier: newTier,
    message: `🎉 Your subscription has been updated to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}!`,
    timestamp: new Date().toISOString()
  };

  console.log(`Broadcasting to ${clients.size} clients:`, message);
  console.log('Clients Set reference in broadcast:', clients);
  console.log('Current clients in broadcast:', Array.from(clients).map(c => c.id));

  for (const client of clients) {
    console.log(`Sending to client ${client.id}`);
    client.send(message);
  }
}