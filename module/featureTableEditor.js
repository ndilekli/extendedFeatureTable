define([  
  'dijit/Dialog',  
  'dijit/form/Button',  
  "dijit/Toolbar",  
  
  "dojo/dom-class",  
  'dojo/dom-construct',  
  'dojo/_base/array',  
  'dojo/_base/declare',  
  "dojo/string",  
  'dojo/_base/lang',  
  'dojo/on',  
  "dojo/query",  
  
  "dojo/text!./templates/featureTableEditor.html",  
  
  'esri/dijit/AttributeInspector',  
  'esri/dijit/FeatureTable',  
  'esri/layers/FeatureLayer',  
  'esri/tasks/query',  
  "esri/graphic"  
], function(  
  Dialog,  
  Button,  
  Toolbar,  
  
  domClass,  
  domConstruct,  
  array,  
  declare,  
  string,  
  lang,  
  on,  
  dojoQuery,  
  
  template,  
  
  AttributeInspector,  
  FeatureTable,  
  FeatureLayer,  
  Query,  
  Graphic  
) {  
  return declare(FeatureTable, {  
    constructor: function(params, srcNodeRef) {  
      var _this = this;  
  
      this.editableCustom = (params.editable === true) ? true : false;  
      params.editable = false;  
  
      this.newRecordAttributes = params.newRecordAttributes || {};  
      this.customHeaderText = params.customHeaderText || null;  
  
  
    },  
  
    buildRendering: function () {  
  
        this.templateString = template;  
        this.inherited(arguments);  
    },  
  
    postCreate: function() {  
      var _this = this;  
  
      console.debug('fte',this)  
      this.on('load',this._postGridCreated);  
  
      //add the main class  
      domClass.add(this.domNode, "fwijitsFeatureTable");      this._i18nStrings.loadingData = "Loading Table Data...";      this._i18nStrings.gridHeader = '${gridTitle} (${featureSelectedCount}/${featureCount} selected)';  
      this.inherited(arguments);  
    },  
  
  
    /////////////////  
    //  Functions that override/enhance functionality in the ESRI featureTable  
    _refreshGrid: function(ids){  
      //forces a refresh of the dataStore item  
      var _this = this;  
      this._createStoreFromDataQuery();  
      var listener = this.grid.on('dgrid-refresh-complete',function(){  
        listener.remove();  
        if (ids){  
          _this.selectRows(ids);  
        }  
  
      });  
    },  
    //override the applyEditsListener  
    _applyEditsListener: function() {  
      var listener = on(this.featureLayer, "edits-complete", lang.hitch(this, function(listener) {  
        this.emit("edits-complete", listener);  
      }));  
      return listener;  
    },  
    // End Functions that override/enhance functionality in the ESRI featureTable  
    ///////////////////////////////////////////////////////////////////////////  
  
  
    startup: function() {  
  
      this.inherited(arguments);  
    },  
  
  
    _updateGridHeaderText: function() {  
      if (this._gridTitleNode){  
        this._gridTitleNode.innerHTML = string.substitute(this._i18nStrings.gridHeader, {  
          gridTitle: this.customHeaderText || this.featureLayer.name || this._i18nStrings.untitled,  
          featureCount: this.featureCount,  
          featureSelectedCount: this._featureSelectedCount  
        });  
      }  
    },  
  
    _postGridCreated: function(){  
      var _this = this;  
  
      //open the row editor on double click  
      this.grid.on('.dgrid-row:dblclick', function(evt) {  
        _this.grid.clearSelection();  
        var row = _this.grid.row(evt);  
        _this.grid.select(row);  
        _this._editSelection();  
        //_this._generateRowEditor(row.id);  
        //_this._toggleLoadingIndicator('block');  
      });  
  
  
    //  this._setupEditorButtons();  
  
      this.on('row-select',function(row){  
        _this._updateEditorButtons('select');  
      });  
      this.on('row-deselect',function(row){  
        _this._updateEditorButtons('deselect');  
      });  
  
      //this._addEditorButtons();  
    },  
  
    _editSelection: function(){  
      //currently only handles single row  
      this._generateRowEditor(this.selectedRowIds[0]);  
      this._toggleLoadingIndicator('block');  
    },  
  
    //_deleteSelection: function(){  
    //  
    //},  
  
    _updateEditorButtons: function(type){  
      console.debug('running',this.selectedRowIds.length,type)  
      var disableButtons = false;  
      if (type == 'deselect' && this.selectedRowIds.length <= 1){  
        disableButtons = true;  
      }  
  
      this._editSelectionButton.setDisabled(disableButtons);  
      //this._deleteSelectionButton.setDisabled(disableButtons);  
    },  
  
  
    _addNew: function() {  
      var _this = this;  
      this._toggleLoadingIndicator('block');  
      this.featureLayer.applyEdits(  
        [{  
          'attributes': _this.newRecordAttributes  
        }],  
        null,  
        null,  
        function(results) {  
          _this._refreshGrid([results[0].objectId]);  
          _this._generateRowEditor(results[0].objectId);  
        },  
        function(err) {  
          alert('the add did not work');  
        }  
      );  
    },  
  
  
    // _addEditorButtons: function() {  
    //  var _this = this;  
    //  
    //  var addnewButtonContainer = domConstruct.create("div", {  
    //    class: 'esri-feature-table-menu-item',  
    //    style: 'float:left'  
    //  }, this.gridMenuAnchor.domNode, "after");  
    //  
    //  var addnewButton = new Button({  
    //    label: "Add New"  
    //  }).placeAt(addnewButtonContainer);  
    //  
    //  addnewButton.on('click', function() {  
    //    _this._toggleLoadingIndicator('block');  
    //    _this.featureLayer.applyEdits(  
    //      [{  
    //        'attributes': _this.newRecordAttributes  
    //      }],  
    //      null,  
    //      null,  
    //      function(results) {  
    //        _this._refreshGrid([results[0].objectId]);  
    //        _this._generateRowEditor(results[0].objectId);  
    //      },  
    //      function(err) {  
    //        alert('the add did not work');  
    //      }  
    //    );  
    //  });  
    // },  
  
    _generateRowEditor: function(rowId) {  
  
      var _this = this;  
  
      var changeToCommit = false;  
  
      var editFields = [];  
      array.forEach(this.featureLayer.fields, function(field) {  
        if (_this.hiddenFields.indexOf(field.name) == -1) {  
          editFields.push({  
            fieldName: field.name,  
            isEditable: true,  
            label: field.alias  
          });  
        }  
      });  
  
      var attInspector = new AttributeInspector({  
        layerInfos: [{  
          'featureLayer': this.featureLayer,  
          'isEditable': true,  
          'fieldInfos': editFields,  
          showDeleteButton: false // a custom delete button will be added later  
        }]  
      }, domConstruct.create("div"));  
      domClass.add(attInspector.domNode, "fwijitsFeatureTableAttInspector");  
  
console.debug(attInspector)  
      if (_this.saveButton) {  
        _this.saveButton.destroy();  
      }  
  
      if (_this.deleteButton) {  
        _this.deleteButton.destroy();  
      }  
  
      if (this.attrInspDialog) {  
        _this.attrInspDialog.destroy();  
      }  
  
      var rowQuery = new Query();  
      rowQuery.where = "ObjectID =" + rowId;  
  
      _this.featureLayer.selectFeatures(rowQuery, FeatureLayer.SELECTION_NEW, function(features) {  
        var updateFeature = features[0];  
        _this.attrInspDialog = new Dialog({  
          title: "Update row",  
          content: attInspector.domNode,  
          style: "width: 350px",  
          class:_this.css.dialog,  
          onHide: function() {  
            _this.saveButton.destroy();  
            _this._toggleLoadingIndicator();  
            //_this.clearSelection();  
          }  
        });  
        _this.attrInspDialog.show();  
  
        //add a delete button  
        _this.deleteButton = new Button({  
          label: "Delete"  
        }, domConstruct.create("div"));  
        domConstruct.place(_this.deleteButton.domNode, attInspector.deleteBtn.domNode, "after");  
        _this.deleteButton.on("click", function() {  
          //alert('delete now')  
          var apply = _this.featureLayer.applyEdits(  
            null,  
            null, [updateFeature]  
          );  
          apply.then(function(res) {  
            _this._refreshGrid();  
          },  
          function(err) {  
            alert('delete failed');  
          });  
          _this.attrInspDialog.hide();  
  
        });  
  
        //add a save button  
        _this.saveButton = new Button({  
          label: "Save",  
          disabled: false  
        }, domConstruct.create("div"));  
        domConstruct.place(_this.saveButton.domNode, attInspector.deleteBtn.domNode, "after");  
        _this.saveButton.on("click", function() {  
          _this.attrInspDialog.hide();  
          if (changeToCommit === true){  
          updateFeature.getLayer().applyEdits(  
            null, [updateFeature],  
            null,  
            function(res) {  
              _this._refreshGrid([rowId]);  
            },  
            function(err) {  
              alert('the update did not work');  
            }  
            );  
          }  
  
        });  
  
        attInspector.on("attribute-change", function(attr) {  
          //_this.saveButton.setDisabled(false);  
          changeToCommit = true;  
          updateFeature.attributes[attr.fieldName] = attr.fieldValue;  
        });  
  
      });  
    },  
  
    //this is a work in progress  
    resizeColumnsToContent: function(newSize) {  
  
      for (var i in this.grid.columns) {  
        var col = this.grid.columns[i];  
        if (col.hidden == false){  
          var fieldName = col.field;  
          var fieldAlias = col.label;  
          var newWidth = this._getColumnWidth(fieldName,fieldAlias);  
          this.grid.resizeColumnWidth(col.id, newWidth);  
        }  
  
      }  
    },  
  
    _stripTags: function(HTML) {  
      var tmp = document.createElement("DIV");  
      tmp.innerHTML = HTML;  
      return tmp.textContent || tmp.innerText;  
    },  
  
    _replaceURLWithHTMLLinks: function(text) {  
      var t = text + "";  
      var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;  
      return t.replace(exp, "<a href='$1' target='blank'>View Page</a>");  
    },  
  
    _getColumnWidth: function(fieldName, fieldAlias, data) {  
      var _this = this;  
      var longestDataField = "-";  
  
      //fetch the field domain  
      var domain = null;  
      array.forEach(this.featureLayer.fields,function(fieldInfo){  
        if (fieldInfo.name == fieldName && fieldInfo.domain){  
          domain = fieldInfo.domain;  
        }  
      });  
  
      array.forEach(this.grid.store.data, function(item) {  
        console.debug('  ',item)  
        var cellData;  
        if (item.attributes) {  
          cellData = item.attributes[fieldName];  
        } else {  
          cellData = item[fieldName];  
        }  
  
        //handle domains  
        if (domain && domain.codedValues){  
          var cellText = '';  
          array.forEach(domain.codedValues,function(codedValue){  
            if (codedValue.code == cellData){  
              cellText = codedValue.name;  
            }  
          });  
          if (cellText !== ''){  
            cellData = cellText;  
          }  
        }  
        console.debug('  ',cellData)  
        //account for empty cells  
        cellData = (!cellData || cellData === null || cellData === ' ' || cellData === '') ? "-" : cellData;  
  
        //Strip any html tags  
        if (typeof cellData === 'string' && cellData.indexOf('<a') > -1) {  
          cellData = _this._stripTags(cellData);  
        } else if (typeof cellData === 'string' && cellData.indexOf('http') > -1 && cellData.indexOf('<a') == -1) {  
          cellData = _this._stripTags(_this._replaceURLWithHTMLLinks(cellData));  
        }  
        //check to see if the current fld is longer than previous flds  
        if (cellData.length > longestDataField.length) {  
          longestDataField = cellData;  
        }  
      });  
  
      //calculate header and cell string length  
      var resizeFactor = 1.5;  
      var maxColumnWidth = 30;  
  
      var cellLen = longestDataField.length / resizeFactor;  
      var hdrLen = fieldAlias.length <= 10 ? fieldAlias.length : fieldAlias.length / 1.3;  
      var columnWidth = hdrLen > cellLen ? hdrLen : cellLen;  
      columnWidth = columnWidth < 30 ? columnWidth : maxColumnWidth;  
      return columnWidth*10;  
    }  
  });  
});  