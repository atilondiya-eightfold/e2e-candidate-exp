export interface ListMeta {
	total?: number;
	totalCount?: number;
	page?: number;
	pageSize?: number;
	cursor?: string;
}

export interface ListEnvelope<T> {
	data: T[];
	meta?: ListMeta;
}

export interface BatchResponse<T> {
	data: T[];
}

export interface ApiResponse<T> {
	data: T;
}

export interface BaseListFilters {
	limit?: number;
	offset?: number;
	page?: number;
	cursor?: string;
	[key: string]: unknown;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Back-compat aliases for old hand-written code that imported Marshmallow class names.
export type MetaSchema = ListMeta;
export type ExternalProfileSchema = any;
export type CourseSchema = any;
export type EmployeeRoleSchema = any;
export type EmployeeSchema = any;
export type LoggedInUserSchema = any;
export type MatchingDemandsSchema = any;
export type MatchingPositionsSchema = any;
export type ProfileFeedbackSchema = any;
export type RecommendedMentorSchema = any;
