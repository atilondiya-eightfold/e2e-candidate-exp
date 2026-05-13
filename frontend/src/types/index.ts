export interface PaginatedResponse<T> {
	data: Array<T>;
	count: number;
}

export interface MessageResponse {
	message: string;
}
