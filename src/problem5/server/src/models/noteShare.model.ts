import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    Unique,
} from "typeorm";
import { Note } from "./note.model";
import { User } from "./user.model";

export type Role = "view" | "comment" | "edit"; // enum alternative

@Entity({ name: "NoteShare" })
@Unique(["noteId", "userId"]) // @@unique([noteId, userId])
export class NoteShare {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    noteId!: string;

    @Column({ type: "uuid" })
    userId!: string;

    @Column({ type: "text" })
    role!: Role;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @ManyToOne(() => Note, (n) => n.shares, { onDelete: "CASCADE" })
    note!: Note;

    @ManyToOne(() => User, (u) => u.shares, { onDelete: "CASCADE" })
    user!: User;
}
