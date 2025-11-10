import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    Index,
} from "typeorm";
import { User } from "./user.model";
import { NoteShare } from "./noteShare.model";

@Entity({ name: "Note" })
@Index("idx_note_owner_updated", ["ownerId", "updatedAt"]) // composite index (ownerId, updatedAt)
export class Note {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    ownerId!: string;

    @ManyToOne(() => User, (u) => u.notes, { onDelete: "CASCADE" })
    owner!: User;

    @Column({ type: "text" })
    title!: string;

    // Prisma had required Json. If you want to allow null, set `nullable: true`.
    // If you want "always present", keep nullable: false and provide a default.
    @Column({ type: "jsonb", nullable: false, default: () => "'{}'::jsonb" })
    content!: unknown;

    @Column({ type: "int", default: 0 })
    lastVersion!: number;

    @Column({ type: "boolean", default: false })
    isPublic!: boolean;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;

    @OneToMany(() => NoteShare, (s) => s.note)
    shares!: NoteShare[];
}
