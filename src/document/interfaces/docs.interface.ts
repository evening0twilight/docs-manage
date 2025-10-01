// 接口定义
import { FileSystemItemEntity } from '../document.entity';

export interface DocumentRo {
  list: FileSystemItemEntity[];
  count: number;
}
