import { supabase } from '../db/client.js';

export type BroadcastChannel =
  | 'conversation'
  | 'projects'
  | 'treasury'
  | 'forum'
  | 'queue';

export interface BroadcastPayload<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
}

export class Broadcaster {
  private channels: Map<string, ReturnType<typeof supabase.channel>> = new Map();

  getChannel(name: BroadcastChannel): ReturnType<typeof supabase.channel> {
    if (!this.channels.has(name)) {
      const channel = supabase.channel(name);
      this.channels.set(name, channel);
      channel.subscribe();
    }
    return this.channels.get(name)!;
  }

  async broadcast<T>(
    channelName: BroadcastChannel,
    event: string,
    data: T
  ): Promise<void> {
    const channel = this.getChannel(channelName);
    const payload: BroadcastPayload<T> = {
      event,
      data,
      timestamp: Date.now(),
    };

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  async broadcastConversationToken(
    memberId: string,
    turnId: string,
    token: string
  ): Promise<void> {
    await this.broadcast('conversation', 'token', {
      memberId,
      turnId,
      token,
    });
  }

  async broadcastConversationEnd(
    memberId: string,
    turnId: string,
    reason: 'completed' | 'timed_out' | 'budget_exhausted'
  ): Promise<void> {
    await this.broadcast('conversation', 'turn_end', {
      memberId,
      turnId,
      reason,
    });
  }

  async broadcastQueueUpdate(memberId: string, queue: unknown[]): Promise<void> {
    await this.broadcast('queue', 'update', {
      memberId,
      queue,
    });
  }

  async broadcastProjectUpdate(projectId: string, project: unknown): Promise<void> {
    await this.broadcast('projects', 'update', {
      projectId,
      project,
    });
  }

  async broadcastTreasuryUpdate(treasury: unknown): Promise<void> {
    await this.broadcast('treasury', 'update', treasury);
  }

  cleanup(): void {
    for (const channel of this.channels.values()) {
      channel.unsubscribe();
    }
    this.channels.clear();
  }
}

export const broadcaster = new Broadcaster();
