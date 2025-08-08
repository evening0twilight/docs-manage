import { DocumentEntity } from '../document.entity';

export interface DocumentRo {
  list: DocumentEntity[];
  count: number;
}
