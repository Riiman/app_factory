from flask import request, jsonify, send_file, current_app
from app.routes import documents_bp
from app import db
from app.models import Startup, Document
from app.services.document_generator import IncubatorGuideGenerator
import os

@documents_bp.route('/generate-document/<submission_id>', methods=['POST'])
def generate_document(submission_id):
    """Generate startup incubator guide document"""
    try:
        startup = Startup.query.filter_by(submission_id=submission_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
        
        # Prepare startup data
        startup_data = startup.to_dict()
        
        # Initialize generator
        generator = IncubatorGuideGenerator(
            api_key=current_app.config['AZURE_OPENAI_API_KEY'],
            endpoint=current_app.config['AZURE_OPENAI_ENDPOINT'],
            deployment_name=current_app.config['AZURE_DEPLOYMENT_NAME']
        )
        
        # Generate document
        document_content = generator.generate_complete_guide(startup_data)
        
        # Save document
        doc_filename = f'{submission_id}_guide.txt'
        doc_path = os.path.join(current_app.config['DOCUMENTS_DIR'], doc_filename)
        
        with open(doc_path, 'w', encoding='utf-8') as f:
            f.write(document_content)
        
        # Update database
        if startup.document:
            startup.document.file_path = doc_path
        else:
            document = Document(startup_id=startup.id, file_path=doc_path)
            db.session.add(document)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Document generated successfully',
            'document_path': doc_path
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@documents_bp.route('/download-document/<submission_id>', methods=['GET'])
def download_document(submission_id):
    """Download generated startup guide document"""
    try:
        startup = Startup.query.filter_by(submission_id=submission_id).first()
        
        if not startup or not startup.document:
            return jsonify({'success': False, 'error': 'Document not found'}), 404
        
        doc_path = startup.document.file_path
        
        if os.path.exists(doc_path):
            return send_file(
                doc_path, 
                as_attachment=True, 
                download_name=f'startup_guide_{submission_id}.txt'
            )
        else:
            return jsonify({'success': False, 'error': 'Document file not found'}), 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
