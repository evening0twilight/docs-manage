import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Yjs 文档状态持久化实体
 * 保存每个协同房间(name,例如 'document-123')的 Yjs 二进制状态,
 * 用于断线/重启后恢复 CRDT 文档。
 */
@Entity('yjs_documents')
export class YjsDocumentEntity {
  @PrimaryColumn({ length: 255 })
  name: string;

  @Column({ type: 'longblob' })
  state: Buffer;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
