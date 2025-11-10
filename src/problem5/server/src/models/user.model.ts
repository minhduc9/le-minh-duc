import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
    Unique,
} from "typeorm";
import { Note } from "./note.model";
import { NoteShare } from "./noteShare.model";

@Entity({ name: "User" })
@Unique(["email"])
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "text" })
    email!: string;

    @Column({ type: "text" })
    name!: string;

    @CreateDateColumn({ type: "timestamptz" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamptz" })
    updatedAt!: Date;

    @OneToMany(() => Note, (n) => n.owner)
    notes!: Note[];

    @OneToMany(() => NoteShare, (s) => s.user)
    shares!: NoteShare[];
}
