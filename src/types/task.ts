interface AssignedTo {
    userId: string;
    indexRange: [number, number];
}
export interface CreateTaskInput {
    name: string;
    description: string;
    datasetId: string;
    assignedTo: AssignedTo[];
  }