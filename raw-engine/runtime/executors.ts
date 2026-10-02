import { PipelineContext } from './context';

export type StepHandler = (input: any, config: Record<string, any>, ctx: PipelineContext) => Promise<any>;

export const executors: Record<string, StepHandler> = {
  // Transform step: Maps or modifies fields
  transform: async (input, config) => {
    if (typeof input !== 'object' || input === null) return input;
    const output = { ...input };
    
    if (config.select && Array.isArray(config.select)) {
      const selected: Record<string, any> = {};
      for (const key of config.select) {
        if (key in output) selected[key] = output[key];
      }
      return selected;
    }
    
    return output;
  },

  // Filter step: Passes data through if condition evaluates to true
  filter: async (input, config) => {
    if (!config.field || !config.op) return input;
    const fieldValue = input[config.field];
    
    switch (config.op) {
      case 'EQUALS':
        return fieldValue === config.value ? input : null;
      case 'NOT_NULL':
        return fieldValue !== null && fieldValue !== undefined ? input : null;
      case 'GREATER_THAN':
        return fieldValue > config.value ? input : null;
      default:
        return input;
    }
  },

  // Aggregate step: Simple field collection
  aggregate: async (input, config) => {
    if (!Array.isArray(input)) return [input];
    if (config.groupBy) {
      return input.reduce((acc, item) => {
        const key = item[config.groupBy] || 'uncategorized';
        acc[key] = acc[key] || [];
        acc[key].push(item);
        return acc;
      }, {});
    }
    return input;
  }
};