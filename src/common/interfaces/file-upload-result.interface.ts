export interface FileUploadResult {
  url: string;
  publicId: string;
  fileName: string;
  mimetype: string;
  size: number;
  // Otros campos que tu microservicio retorne
}

export interface FileToDelete {
  publicId: string;
  // Otros campos necesarios para la eliminación, como userId si el microservicio lo valida
}