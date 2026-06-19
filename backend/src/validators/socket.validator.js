import { z } from 'zod';

export const captureTileSchema = z.object({
  tileId: z.string().min(1)
});
