import { CommandAction, filterCommands, getRoleAwareCommands } from '../../services/commandPaletteService';
import { runtimeEventService } from '../../runtime/production';
import { CommandExecutionContext, CommandSuggestion } from './types';

export class CommandCenterOrchestrator {
  listAvailable(role?: CommandExecutionContext['role']) {
    return getRoleAwareCommands(role);
  }

  search(role: CommandExecutionContext['role'], query: string) {
    return filterCommands(getRoleAwareCommands(role), query);
  }

  async execute(action: CommandAction, context: CommandExecutionContext): Promise<void> {
    await runtimeEventService.emit(
      'command_center.action_executed',
      { action, role: context.role, userId: context.userId },
      context.tenantId || 'global',
      `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    );
  }

  recommend(role: CommandExecutionContext['role']): CommandSuggestion[] {
    const commands = getRoleAwareCommands(role).slice(0, 5);
    return commands.map((cmd, index) => ({
      id: `suggest_${cmd.id}`,
      title: cmd.title,
      subtitle: cmd.subtitle,
      action: cmd.id,
      confidence: Math.max(0.5, 0.95 - index * 0.1),
    }));
  }
}

export const commandCenterOrchestrator = new CommandCenterOrchestrator();

