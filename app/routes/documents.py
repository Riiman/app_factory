
from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.models import User, Document, Submission
from app.services.document_generator import DocumentGenerator
from app import db
from config import Config
import os

documents_bp = Blueprint('documents', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xlsx', 'xls'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@documents_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_document():
    """
    Generate a document using AI
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        document_type = data.get('documentType')
        submission_id = data.get('submissionId')
        custom_prompt = data.get('customPrompt', '')
        
        if not document_type or not submission_id:
            return jsonify({'error': 'Document type and submission ID are required'}), 400
        
        # Verify submission belongs to user
        submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        # Check document limit
        existing_docs = Document.query.filter_by(
            user_id=int(user_id), 
            submission_id=submission_id
        ).count()
        
        if existing_docs >= Config.DOCUMENTS_PER_SUBMISSION:
            return jsonify({'error': 'Document limit reached for this submission'}), 400
        
        # Generate document
        generator = DocumentGenerator()
        result = generator.generate_document(
            document_type=document_type,
            submission_data=submission.to_dict(),
            custom_prompt=custom_prompt
        )
        
        if not result['success']:
            return jsonify({'error': result['error']}), 500
        
        # Create document record
        document = Document(
            user_id=user_id,
            submission_id=submission_id,
            document_type=document_type,
            title=result['title'],
            file_name=result['file_name'],
            file_path=result['file_path'],
            file_size=result['file_size'],
            mime_type=result['mime_type'],
            is_generated=True,
            generation_prompt=custom_prompt,
            generation_model=Config.OPENAI_MODEL
        )
        
        db.session.add(document)
        db.session.commit()
        
        # Send email notification
        from email_utils import send_document_generation_email
        user = User.query.get(int(user_id))
        send_document_generation_email(user.email, document_type, result['title'])
        
        return jsonify({
            'message': 'Document generated successfully',
            'document': document.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/', methods=['GET'])
@jwt_required()
def get_documents():
    """
    Get all documents for the current user
    """
    try:
        user_id = get_jwt_identity()
        submission_id = request.args.get('submissionId')
        document_type = request.args.get('documentType')
        
        query = Document.query.filter_by(user_id=user_id, status='active')
        
        if submission_id:
            query = query.filter_by(submission_id=submission_id)
        
        if document_type:
            query = query.filter_by(document_type=document_type)
        
        documents = query.order_by(Document.created_at.desc()).all()
        
        return jsonify({
            'documents': [doc.to_dict() for doc in documents]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    """
    Get a specific document
    """
    try:
        user_id = get_jwt_identity()
        document = Document.query.filter_by(id=document_id, user_id=user_id).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        return jsonify({'document': document.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/<int:document_id>/download', methods=['GET'])
@jwt_required()
def download_document(document_id):
    """
    Download a document
    """
    try:
        user_id = get_jwt_identity()
        document = Document.query.filter_by(id=document_id, user_id=user_id).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        file_path = document.file_path
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found on server'}), 404
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=document.file_name,
            mimetype=document.mime_type
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/<int:document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    """
    Delete a document (soft delete)
    """
    try:
        user_id = get_jwt_identity()
        document = Document.query.filter_by(id=document_id, user_id=user_id).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # Soft delete
        document.status = 'deleted'
        db.session.commit()
        
        return jsonify({'message': 'Document deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@documents_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    """
    Upload a document file
    """
    try:
        user_id = get_jwt_identity()
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Get additional data
        submission_id = request.form.get('submissionId')
        document_type = request.form.get('documentType', 'other')
        title = request.form.get('title', file.filename)
        
        if not submission_id:
            return jsonify({'error': 'Submission ID is required'}), 400
        
        # Verify submission belongs to user
        submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        # Check document limit
        existing_docs = Document.query.filter_by(
            user_id=user_id, 
            submission_id=submission_id
        ).count()
        
        if existing_docs >= Config.DOCUMENTS_PER_SUBMISSION:
            return jsonify({'error': 'Document limit reached for this submission'}), 400
        
        # Secure filename and save
        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{user_id}_{timestamp}_{filename}"
        
        # Create user upload directory
        user_upload_dir = os.path.join(Config.UPLOAD_FOLDER, str(user_id))
        os.makedirs(user_upload_dir, exist_ok=True)
        
        file_path = os.path.join(user_upload_dir, unique_filename)
        file.save(file_path)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        mime_type = file.content_type or 'application/octet-stream'
        
        # Create document record
        document = Document(
            user_id=user_id,
            submission_id=submission_id,
            document_type=document_type,
            title=title,
            file_name=filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            is_generated=False
        )
        
        db.session.add(document)
        db.session.commit()
        
        return jsonify({
            'message': 'Document uploaded successfully',
            'document': document.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/<int:document_id>/update', methods=['PUT'])
@jwt_required()
def update_document(document_id):
    """
    Update document metadata
    """
    try:
        user_id = get_jwt_identity()
        document = Document.query.filter_by(id=document_id, user_id=user_id).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'title' in data:
            document.title = data['title']
        
        if 'documentType' in data:
            document.document_type = data['documentType']
        
        document.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Document updated successfully',
            'document': document.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500