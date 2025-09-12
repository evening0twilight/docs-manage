// 接口定义
import { DocumentEntity } from '../document.entity';

export interface DocumentRo {
  list: DocumentEntity[];
  count: number;
}
