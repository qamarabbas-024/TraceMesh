import { InputType, NormalizedResult } from '@tracemesh/shared';

export interface ToolRunner {
  readonly toolName: string;
  readonly supportedInputTypes: InputType[];

  execute(input: string, inputType: InputType): Promise<NormalizedResult>;
}
